import { siteUrl } from "../../lib/blog/config";
import { type Post } from "../../lib/blog/contract";
import { listWorkspaces, loadWorkspace } from "./workspace";

export type ArticleSummary = Pick<Post, "slug" | "title" | "description" | "category" | "tags" | "status"> & { url?: string; workspace?: string };
export const summarize = (meta: Pick<Post, "slug" | "title" | "description" | "category" | "tags" | "status">, workspace?: string): ArticleSummary => ({
  slug: meta.slug, title: meta.title, description: meta.description, category: meta.category,
  tags: meta.tags, status: meta.status, workspace,
  // Local work and unpublished DB rows must never become link targets.
  ...(!workspace && meta.status === "published" ? { url: siteUrl(`/blog/${meta.slug}`) } : {}),
});
const stop = new Set("a an the how to for in of and or with on from your this that is are guide practical build building using use explain discuss article".split(" "));
const tokens = (s: string) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => t.length > 1 && !stop.has(t)));
function similarity(a: Set<string>, b: Set<string>) {
  const intersection = [...a].filter(t => b.has(t)).length;
  return intersection / Math.max(1, a.size + b.size - intersection);
}
export function searchArticles(posts: ArticleSummary[], query: { slug?: string; topic: string; tags?: string[]; category?: string }) {
  const topic = tokens(query.topic), slug = tokens(query.slug || query.topic);
  return posts.map(post => {
    const titleSimilarity = Math.max(similarity(slug, tokens(post.slug)), similarity(slug, tokens(post.title)), similarity(topic, tokens(post.title)));
    const exactSlug = post.slug === query.slug;
    const score = titleSimilarity * 0.7 + similarity(topic, tokens(post.description)) * 0.2 +
      similarity(tokens((query.tags || []).join(" ")), tokens(post.tags.join(" "))) * 0.08 + (query.category === post.category ? 0.02 : 0);
    return { ...post, score, covered: exactSlug || titleSimilarity >= 0.65, reason: exactSlug ? "Same slug" : titleSimilarity >= 0.65 ? "Strong title/topic overlap (heuristic)" : "Related metadata" };
  }).filter(p => p.score > 0.08 || p.covered).sort((a, b) => Number(b.covered) - Number(a.covered) || b.score - a.score);
}

export async function localArticles() {
  const posts: ArticleSummary[] = [];
  for (const row of await listWorkspaces()) {
    try { const w = await loadWorkspace(row.id); posts.push(summarize(w.meta, w.id)); }
    catch { /* Invalid local work is shown separately by the TUI. */ }
  }
  return posts;
}

export async function databaseArticles(): Promise<ArticleSummary[]> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for blog coverage lookup");
  // Lazy imports keep local tooling and tests independent of a live DB connection.
  // Select metadata only: no content blobs, bucket reads, locks or writes.
  const [{ default: db }, { blogPosts }] = await Promise.all([
    import("../../lib/db"), import("../../lib/db/blog-schema"),
  ]);
  const posts = await db.select({
    slug: blogPosts.slug, title: blogPosts.title, description: blogPosts.description,
    category: blogPosts.category, tags: blogPosts.tags, status: blogPosts.status,
  }).from(blogPosts).orderBy(blogPosts.slug);
  return posts.map(p => summarize(p));
}

/** Cached metadata-only DB reads; never queries or falls back to R2.
 * In-flight requests coalesce. Failures are NOT cached as empty results. */
export class ArticleCatalog {
  private cache?: { posts: ArticleSummary[]; expires: number };
  private pending?: Promise<ArticleSummary[]>;
  constructor(private query: () => Promise<ArticleSummary[]> = databaseArticles, private ttl = 60_000, private now = Date.now) {}
  invalidate() { if (this.cache) this.cache.expires = 0; }
  async database(fresh = false): Promise<ArticleSummary[]> {
    if (this.pending) { await this.pending; if (!fresh) return this.cache!.posts; }
    if (!fresh && this.cache && this.cache.expires > this.now()) return this.cache.posts;
    this.pending = (async () => {
      const posts = await this.query();
      this.cache = { posts, expires: this.now() + this.ttl };
      return posts;
    })();
    try { return await this.pending; } finally { this.pending = undefined; }
  }
  async all(fresh = false) {
    return [...await this.database(fresh), ...await localArticles()];
  }
}
let shared: ArticleCatalog | undefined;
export const articleCatalog = () => shared ||= new ArticleCatalog();
