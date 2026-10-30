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
import { parsePost, serializePost, type Post } from "../../lib/blog/contract";

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

  await mkdir(path, { recursive: true });
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
    throw new Error("Cover exceeds 10MB");
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
  throw new Error("Invalid cover: only raster PNG/JPEG/WebP accepted");
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

  const fingerprint = hash(
    raw + "\0" + (cover ? hash(cover) : parsed.meta.cover.src),
  );

  return { id, path, raw, ...parsed, state, cover, fingerprint };
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
