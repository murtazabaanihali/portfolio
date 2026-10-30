import {
  mkdir,
  readFile,
  writeFile,
  realpath,
  lstat,
  rm,
  readdir,
} from "node:fs/promises";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { parsePost, serializePost, imageNodes, localImagePath, type Post } from "../../lib/blog/contract";

/** Read only referenced, regular image files; never follow directory/file symlinks. */
async function readInlineImages(base: string, body: string): Promise<Record<string, Uint8Array>> {
  const images: Record<string, Uint8Array> = {};
  const paths = [...new Set(imageNodes(body).map(n => n.url).filter(localImagePath))].sort();
  if (paths.length > 50) throw new Error("At most 50 inline images per article");
  let total = 0;
  for (const src of paths) {
    const directory = join(base, "images");
    if (!(await lstat(directory)).isDirectory() || (await lstat(directory)).isSymbolicLink()) {
      throw new Error("Inline images directory must not be a symlink");
    }
    const file = join(base, src);
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Inline image must be a regular file, not a symlink");
    if (stat.size > 10 * 1024 * 1024) throw new Error("Image exceeds 10MB");
    const data = await readFile(file);
    imageType(data);
    total += data.length;
    if (total > 50 * 1024 * 1024) throw new Error("Inline images exceed 50MB total");
    images[src] = data;
  }
  return images;
}

/** Base directory for the blog tooling. */
export const TOOL_DIR = dirname(fileURLToPath(import.meta.url));

/** Local root directory storing staged workspaces. */
export const WORK_ROOT = join(TOOL_DIR, ".work");

/** Resolved path to the author/editorial context document. */
export const CONTEXT_PATH = process.env.BLOG_CONTEXT_PATH
  ? resolve(process.env.BLOG_CONTEXT_PATH)
  : join(TOOL_DIR, "blog-context.md");

/** Compute SHA-256 hash of a string or byte array. */
export const hash = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

/** Persisted metadata and review state for a local workspace in `state.json`. */
export type WorkspaceState = {
  owned: "portfolio-blog-v1";
  originalSlug: string;
  baselineRevision?: string;
  approval?: string;
  sources?: string[];
  warnings?: string[];
  textModel?: string;
  requestedTextModel?: string;
  imageModel?: string;
  generationKey?: string;
};

/**
 * Resolve and validate the absolute path of a workspace directory.
 * Ensures the ID is a valid UUID, rejects symlinks, and validates tool ownership.
 */
export async function workspacePath(id: string): Promise<string> {
  if (!/^[a-f0-9-]{36}$/.test(id)) {
    throw new Error("Workspace ID must be a tool-created UUID");
  }
  const root = await realpath(WORK_ROOT);
  const path = join(root, id);

  if ((await lstat(path)).isSymbolicLink() || (await realpath(path)) !== path) {
    throw new Error("Refusing symlink workspace");
  }

  const state = JSON.parse(
    await readFile(join(path, "state.json"), "utf8"),
  ) as WorkspaceState;

  if (state.owned !== "portfolio-blog-v1") {
    throw new Error("Not a tool-owned workspace");
  }

  return path;
}

/** Save updated workspace state to its `state.json` file. */
export async function saveState(
  id: string,
  state: WorkspaceState,
): Promise<void> {
  const path = await workspacePath(id);
  await writeFile(join(path, "state.json"), JSON.stringify(state, null, 2));
}

/**
 * Create a new local workspace directory containing `post.md`, `state.json`,
 * and an optional cover image.
 */
export async function createWorkspace(
  raw: string,
  cover?: Uint8Array,
  coverExtension = ".png",
  extra: Partial<WorkspaceState> = {},
  images: Record<string, Uint8Array> = {},
): Promise<string> {
  const parsed = parsePost(raw, true);
  const id = randomUUID();
  const path = join(WORK_ROOT, id);

  if (cover) {
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(coverExtension)) {
      throw new Error("Cover must be PNG/JPEG/WebP");
    }
    imageType(cover);
    parsed.meta.cover.src = "./cover" + coverExtension;
  } else if (parsed.meta.cover.src.startsWith("./")) {
    throw new Error("Supply the local cover when importing");
  }

  const referenced = [...new Set(imageNodes(parsed.body).map(n => n.url).filter(localImagePath))];
  if (referenced.length > 50) throw new Error("At most 50 inline images per article");
  let total = 0;
  for (const src of referenced) {
    if (!images[src]) throw new Error(`Supply the local inline image when importing: ${src}`);
    imageType(images[src]);
    total += images[src].length;
  }
  if (total > 50 * 1024 * 1024) throw new Error("Inline images exceed 50MB total");

  await mkdir(path, { recursive: true });
  if (referenced.length) {
    await mkdir(join(path, "images"));
    for (const src of referenced) await writeFile(join(path, src), images[src]);
  }
  await writeFile(
    join(path, "post.md"),
    serializePost(parsed.meta, parsed.body),
  );
  if (cover) {
    await writeFile(join(path, "cover" + coverExtension), cover);
  }

  const statePayload: WorkspaceState = {
    ...extra,
    owned: "portfolio-blog-v1",
    originalSlug: parsed.meta.slug,
  };
  await writeFile(
    join(path, "state.json"),
    JSON.stringify(statePayload, null, 2),
  );

  return id;
}

/**
 * Import an existing Markdown post file and its optional cover image
 * into a newly provisioned local workspace.
 */
export async function importPost(
  file: string,
  coverFile?: string,
): Promise<string> {
  const raw = await readFile(file, "utf8");
  const p = parsePost(raw, true);
  const coverPath =
    coverFile ||
    (p.meta.cover.src.startsWith("./")
      ? resolve(dirname(file), p.meta.cover.src)
      : undefined);

  return createWorkspace(
    raw,
    coverPath ? await readFile(coverPath) : undefined,
    coverPath ? extname(coverPath).toLowerCase() : ".png",
    { sources: [resolve(file)] },
    await readInlineImages(dirname(resolve(file)), p.body),
  );
}

/**
 * Validate image bytes by inspecting magic numbers.
 * Supported formats: PNG, JPEG, WebP (max 10MB).
 */
export function imageType(
  data: Uint8Array,
): "image/png" | "image/jpeg" | "image/webp" {
  if (data.length > 10 * 1024 * 1024) {
    throw new Error("Image exceeds 10MB");
  }
  if (data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71) {
    return "image/png";
  }
  if (data[0] === 255 && data[1] === 216 && data[2] === 255) {
    return "image/jpeg";
  }
  if (
    new TextDecoder().decode(data.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(data.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  throw new Error("Invalid image: only raster PNG/JPEG/WebP accepted");
}

/**
 * Load a workspace by ID, reading and validating `post.md`, `state.json`,
 * and any referenced local cover image.
 */
export async function loadWorkspace(id: string) {
  const path = await workspacePath(id);

  // Reject symlinks inside the workspace directory
  for (const f of await readdir(path)) {
    if ((await lstat(join(path, f))).isSymbolicLink()) {
      throw new Error("Workspace contains a symlink");
    }
  }

  const raw = await readFile(join(path, "post.md"), "utf8");
  const parsed = parsePost(raw, true);
  const state = JSON.parse(
    await readFile(join(path, "state.json"), "utf8"),
  ) as WorkspaceState;

  if (state.originalSlug !== parsed.meta.slug) {
    throw new Error(
      "Slug changed. Import as a new post and explicitly remove the old URL instead.",
    );
  }

  const cover = parsed.meta.cover.src.startsWith("./")
    ? await readFile(join(path, parsed.meta.cover.src))
    : undefined;

  if (cover) {
    imageType(cover);
  }

  const images = await readInlineImages(path, parsed.body);
  const imageHashes = Object.entries(images).map(([src, data]) => [src, hash(data)]);
  const fingerprint = hash(
    raw + "\0" + (cover ? hash(cover) : parsed.meta.cover.src) +
    (imageHashes.length ? "\0" + JSON.stringify(imageHashes) : ""),
  );

  return { id, path, raw, ...parsed, state, cover, images, fingerprint };
}

/** Approve the current workspace revision by recording its fingerprint in state.json. */
export async function approve(id: string) {
  const w = await loadWorkspace(id);
  await saveState(id, { ...w.state, approval: w.fingerprint });
  return { id, approved: w.fingerprint };
}

/** Update the editorial status of a workspace (draft or published) and update timestamps. */
export async function setStatus(
  id: string,
  status: Post["status"],
): Promise<void> {
  const w = await loadWorkspace(id);
  const now = new Date().toISOString();

  w.meta.status = status;
  if (status === "published") {
    w.meta.publishedAt ||= now;
    w.meta.updatedAt = now;
  }

  await writeFile(join(w.path, "post.md"), serializePost(w.meta, w.body));
}

/** List all local workspaces and their approval/validation statuses. */
export async function listWorkspaces() {
  try {
    const ids = (await readdir(WORK_ROOT)).filter((id) =>
      /^[a-f0-9-]{36}$/.test(id),
    );
    return Promise.all(
      ids.map(async (id) => {
        try {
          const w = await loadWorkspace(id);
          return {
            id,
            title: w.meta.title,
            status: w.meta.status,
            approved: w.state.approval === w.fingerprint,
          };
        } catch (e) {
          return {
            id,
            title: "Needs attention",
            status: "invalid",
            approved: false,
            error: String(e),
          };
        }
      }),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw e;
  }
}

/** Remove a workspace directory and all its files after checking permissions. */
export async function cleanup(id: string): Promise<void> {
  if (!/^[a-f0-9-]{36}$/.test(id)) {
    throw new Error("Workspace ID must be a tool-created UUID");
  }

  try {
    const path = await workspacePath(id);
    await rm(path, { recursive: true, force: true });
  } catch {
    const root = await realpath(WORK_ROOT);
    const path = join(root, id);
    if (
      !(await lstat(path)).isSymbolicLink() &&
      (await realpath(path)) === path
    ) {
      await rm(path, { recursive: true, force: true });
    }
  }
}
