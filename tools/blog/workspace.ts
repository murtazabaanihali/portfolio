import { mkdir, readFile, writeFile, realpath, lstat, rm, readdir } from "node:fs/promises";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { parsePost, serializePost, type Post } from "../../lib/blog/contract";

export const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
export const WORK_ROOT = join(TOOL_DIR, ".work");
export const CONTEXT_PATH = process.env.BLOG_CONTEXT_PATH ? resolve(process.env.BLOG_CONTEXT_PATH) : join(TOOL_DIR, "blog-context.md");
export const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
export type WorkspaceState = { owned: "portfolio-blog-v1"; originalSlug: string; baselineRevision?: string; approval?: string; sources?: string[]; warnings?: string[]; textModel?: string; requestedTextModel?: string; imageModel?: string; generationKey?: string };
export async function workspacePath(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Workspace ID must be a tool-created UUID");
  const root = await realpath(WORK_ROOT), path = join(root, id);
  if ((await lstat(path)).isSymbolicLink() || await realpath(path) !== path) throw new Error("Refusing symlink workspace");
  const state = JSON.parse(await readFile(join(path, "state.json"), "utf8")) as WorkspaceState;
  if (state.owned !== "portfolio-blog-v1") throw new Error("Not a tool-owned workspace");
  return path;
}
export async function saveState(id: string, state: WorkspaceState) {
  const path = await workspacePath(id);
  await writeFile(join(path, "state.json"), JSON.stringify(state, null, 2));
}
export async function createWorkspace(raw: string, cover?: Uint8Array, coverExtension = ".png", extra: Partial<WorkspaceState> = {}) {
  const parsed = parsePost(raw, true), id = randomUUID(), path = join(WORK_ROOT, id);
  if (cover) {
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(coverExtension)) throw new Error("Cover must be PNG/JPEG/WebP");
    imageType(cover);
    parsed.meta.cover.src = "./cover" + coverExtension;
  } else if (parsed.meta.cover.src.startsWith("./")) throw new Error("Supply the local cover when importing");
  await mkdir(path, { recursive: true });
  await writeFile(join(path, "post.md"), serializePost(parsed.meta, parsed.body));
  if (cover) await writeFile(join(path, "cover" + coverExtension), cover);
  await writeFile(join(path, "state.json"), JSON.stringify({ ...extra, owned: "portfolio-blog-v1", originalSlug: parsed.meta.slug } satisfies WorkspaceState, null, 2));
  return id;
}
export async function importPost(file: string, coverFile?: string) {
  const raw = await readFile(file, "utf8");
  const p = parsePost(raw, true);
  const coverPath = coverFile || (p.meta.cover.src.startsWith("./") ? resolve(dirname(file), p.meta.cover.src) : undefined);
  return createWorkspace(raw, coverPath ? await readFile(coverPath) : undefined, coverPath ? extname(coverPath).toLowerCase() : ".png", { sources: [resolve(file)] });
}
export function imageType(data: Uint8Array) {
  if (data.length > 10 * 1024 * 1024) throw new Error("Cover exceeds 10MB");
  if (data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71) return "image/png";
  if (data[0] === 255 && data[1] === 216 && data[2] === 255) return "image/jpeg";
  if (new TextDecoder().decode(data.slice(0, 4)) === "RIFF" && new TextDecoder().decode(data.slice(8, 12)) === "WEBP") return "image/webp";
  throw new Error("Invalid cover: only raster PNG/JPEG/WebP accepted");
}
export async function loadWorkspace(id: string) {
  const path = await workspacePath(id);
  // Reject file symlinks as well, before reading or opening an editor.
  for (const f of await readdir(path)) if ((await lstat(join(path, f))).isSymbolicLink()) throw new Error("Workspace contains a symlink");
  const raw = await readFile(join(path, "post.md"), "utf8"), parsed = parsePost(raw, true);
  const state = JSON.parse(await readFile(join(path, "state.json"), "utf8")) as WorkspaceState;
  if (state.originalSlug !== parsed.meta.slug) throw new Error("Slug changed. Import as a new post and explicitly remove the old URL instead.");
  const cover = parsed.meta.cover.src.startsWith("./") ? await readFile(join(path, parsed.meta.cover.src)) : undefined;
  if (cover) imageType(cover);
  const fingerprint = hash(raw + "\0" + (cover ? hash(cover) : parsed.meta.cover.src));
  return { id, path, raw, ...parsed, state, cover, fingerprint };
}
export async function approve(id: string) {
  const w = await loadWorkspace(id);
  await saveState(id, { ...w.state, approval: w.fingerprint });
  return { id, approved: w.fingerprint };
}
export async function setStatus(id: string, status: Post["status"]) {
  const w = await loadWorkspace(id), now = new Date().toISOString();
  w.meta.status = status;
  if (status === "published") { w.meta.publishedAt ||= now; w.meta.updatedAt = now; }
  await writeFile(join(w.path, "post.md"), serializePost(w.meta, w.body));
}
export async function listWorkspaces() {
  try {
    const ids = (await readdir(WORK_ROOT)).filter(id => /^[a-f0-9-]{36}$/.test(id));
    return Promise.all(ids.map(async id => {
      try { const w = await loadWorkspace(id); return { id, title: w.meta.title, status: w.meta.status, approved: w.state.approval === w.fingerprint }; }
      catch (e) { return { id, title: "Needs attention", status: "invalid", approved: false, error: String(e) }; }
    }));
  } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; }
}
export async function cleanup(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Workspace ID must be a tool-created UUID");
  try {
    const path = await workspacePath(id);
    await rm(path, { recursive: true, force: true });
  } catch {
    const root = await realpath(WORK_ROOT);
    const path = join(root, id);
    if (!(await lstat(path)).isSymbolicLink() && (await realpath(path)) === path) {
      await rm(path, { recursive: true, force: true });
    }
  }
}
