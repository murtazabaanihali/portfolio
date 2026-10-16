// Explicit local-only Worker smoke fixture. Never invokes R2 remote mode.
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { serializePost, type Post, type Entry } from "../../lib/blog/contract";
import { hash } from "./workspace";
if (!process.argv.includes("--yes")) throw new Error("Pass --yes to replace LOCAL blog fixture state; this never touches remote R2.");
const meta: Post = {
  version: 1, slug: "local-preview-fixture", title: "Local preview: dependable publishing",
  description: "A local-only fixture for checking full server-rendered content, metadata, discovery, and draft exclusion.",
  author: "Murtaza Baanihali", status: "published", category: "ai-agents", tags: ["ai-agents", "testing"],
  publishedAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-02T00:00:00Z",
  cover: { src: "https://images.example.com/local-only-cover.png", alt: "Local fixture illustration, not a production cover" },
};
const body = "WORKER_SSR_ARTICLE_MARKER: This complete article body must appear without browser JavaScript.\n\n## First heading\n\nPlain Markdown and **strong text**.\n\n## Second heading\n\nA useful explanation.\n\n## Third heading\n\n| Feature | Status |\n| --- | --- |\n| HTML | Server rendered |\n\n## Fourth heading\n\nA final paragraph with enough content for a table of contents.";
const prefix = "blog/objects/local-smoke/";
const raw = serializePost(meta, body);
const post: Entry = { meta, key: prefix + "article.md", revision: hash(raw), assets: [] };
const draftMeta: Post = { ...meta, slug: "local-hidden-draft", title: "HIDDEN_DRAFT_MARKER", status: "draft", publishedAt: null, updatedAt: null };
const draftRaw = serializePost(draftMeta, body);
const draft: Entry = { meta: draftMeta, key: prefix + "draft.md", revision: hash(draftRaw), assets: [] };
const objects = {
  [post.key]: raw, [draft.key]: draftRaw,
  [prefix + "manifest.json"]: JSON.stringify({ version: 1, posts: [post] }),
  [prefix + "inventory.json"]: JSON.stringify({ version: 1, posts: [draft, post], retired: [] }),
  "blog/head.json": JSON.stringify({ version: 1, commit: "local-smoke", manifest: prefix + "manifest.json", inventory: prefix + "inventory.json" }),
};
const temp = await mkdtemp(join(tmpdir(), "blog-local-fixture-"));
try {
  for (const [key, content] of Object.entries(objects)) {
    const path = join(temp, "object"); await writeFile(path, content);
    const child = Bun.spawn(["bunx", "wrangler", "r2", "object", "put", "portfolio-blog/" + key, "--local", "--file", path], { stdout: "inherit", stderr: "inherit" });
    if (await child.exited !== 0) throw new Error("Local fixture write failed");
  }
} finally { await rm(temp, { recursive: true }); }
console.log("Local-only fixture ready: /blog/local-preview-fixture");
