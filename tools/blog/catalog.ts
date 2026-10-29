import { siteUrl } from "../../lib/blog/config";
import { type Post } from "../../lib/blog/contract";
import { listWorkspaces, loadWorkspace } from "./workspace";

/** High-level summary of an article used for duplicate checks and coverage search. */
export type ArticleSummary = Pick<
  Post,
  "slug" | "title" | "description" | "category" | "tags" | "status"
> & {
  url?: string;
  workspace?: string;
};

/** Convert post metadata into an ArticleSummary, attaching canonical URLs only to live published posts. */
export const summarize = (
  meta: Pick<
    Post,
    "slug" | "title" | "description" | "category" | "tags" | "status"
  >,
  workspace?: string,
): ArticleSummary => ({
  slug: meta.slug,
  title: meta.title,
  description: meta.description,
  category: meta.category,
  tags: meta.tags,
  status: meta.status,
  workspace,
  // Local work and unpublished DB rows must never become link targets.
  ...(!workspace && meta.status === "published"
    ? { url: siteUrl(`/blog/${meta.slug}`) }
    : {}),
});

/** Stopwords excluded from search and similarity tokens. */
const stop = new Set(
  "a an the how to for in of and or with on from your this that is are guide practical build building using use explain discuss article".split(
    " ",
  ),
);

/** Extract alphanumeric lowercase search tokens longer than 1 character. */
const tokens = (s: string) =>
  new Set(
    (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(
      (t) => t.length > 1 && !stop.has(t),
    ),
  );

/** Compute Jaccard similarity coefficient between two sets of tokens. */
function similarity(a: Set<string>, b: Set<string>): number {
  const intersection = [...a].filter((t) => b.has(t)).length;
  return intersection / Math.max(1, a.size + b.size - intersection);
}

/**
 * Score and rank articles by relevance to a query slug, topic, tags, and category.
 * Flags posts as covered if there is an exact slug match or strong title overlap (>= 0.65).
 */
export function searchArticles(
  posts: ArticleSummary[],
  query: {
    slug?: string;
    topic: string;
    tags?: string[];
    category?: string;
  },
) {
  const topic = tokens(query.topic);
  const slug = tokens(query.slug || query.topic);

  return posts
    .map((post) => {
      const titleSimilarity = Math.max(
        similarity(slug, tokens(post.slug)),
        similarity(slug, tokens(post.title)),
        similarity(topic, tokens(post.title)),
      );
      const exactSlug = post.slug === query.slug;
      const score =
        titleSimilarity * 0.7 +
        similarity(topic, tokens(post.description)) * 0.2 +
        similarity(
          tokens((query.tags || []).join(" ")),
          tokens(post.tags.join(" ")),
        ) *
          0.08 +
        (query.category === post.category ? 0.02 : 0);

      const covered = exactSlug || titleSimilarity >= 0.65;
      const reason = exactSlug
        ? "Same slug"
        : titleSimilarity >= 0.65
          ? "Strong title/topic overlap (heuristic)"
          : "Related metadata";

      return { ...post, score, covered, reason };
    })
    .filter((p) => p.score > 0.08 || p.covered)
    .sort((a, b) => Number(b.covered) - Number(a.covered) || b.score - a.score);
}

/** Scan and summarize all readable local workspace drafts. */
export async function localArticles(): Promise<ArticleSummary[]> {
  const posts: ArticleSummary[] = [];
  for (const row of await listWorkspaces()) {
    try {
      const w = await loadWorkspace(row.id);
      posts.push(summarize(w.meta, w.id));
    } catch {
      // Invalid local work is shown separately by the TUI.
    }
  }
  return posts;
}

/** Query the PostgreSQL database mirror for article metadata only. */
export async function databaseArticles(): Promise<ArticleSummary[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for blog coverage lookup");
  }

  // Lazy imports keep local tooling and tests independent of a live DB connection.
  // Select metadata only: no content blobs, bucket reads, locks or writes.
  const [{ default: db }, { blogPosts }] = await Promise.all([
    import("../../lib/db"),
    import("../../lib/db/blog-schema"),
  ]);

  const posts = await db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      description: blogPosts.description,
      category: blogPosts.category,
      tags: blogPosts.tags,
      status: blogPosts.status,
    })
    .from(blogPosts)
    .orderBy(blogPosts.slug);

  return posts.map((p) => summarize(p));
}

/**
 * Cached metadata-only article catalog.
 * Coalesces in-flight DB queries and caches results with TTL (default 60s).
 * Does not cache database failures.
 */
export class ArticleCatalog {
  private cache?: { posts: ArticleSummary[]; expires: number };
  private pending?: Promise<ArticleSummary[]>;

  constructor(
    private query: () => Promise<ArticleSummary[]> = databaseArticles,
    private ttl = 60_000,
    private now = Date.now,
  ) {}

  /** Invalidate the current in-memory database cache. */
  invalidate(): void {
    if (this.cache) {
      this.cache.expires = 0;
    }
  }

  /** Retrieve database article summaries, utilizing cache and request coalescing. */
  async database(fresh = false): Promise<ArticleSummary[]> {
    if (this.pending) {
      await this.pending;
      if (!fresh) {
        return this.cache!.posts;
      }
    }

    if (!fresh && this.cache && this.cache.expires > this.now()) {
      return this.cache.posts;
    }

    this.pending = (async () => {
      const posts = await this.query();
      this.cache = { posts, expires: this.now() + this.ttl };
      return posts;
    })();

    try {
      return await this.pending;
    } finally {
      this.pending = undefined;
    }
  }

  /** Combine cached database articles with freshly rescanned local workspaces. */
  async all(fresh = false): Promise<ArticleSummary[]> {
    const [dbPosts, localPosts] = await Promise.all([
      this.database(fresh),
      localArticles(),
    ]);
    return [...dbPosts, ...localPosts];
  }
}

let shared: ArticleCatalog | undefined;

/** Retrieve or lazily initialize the shared ArticleCatalog singleton. */
export const articleCatalog = (): ArticleCatalog => {
  if (!shared) {
    shared = new ArticleCatalog();
  }
  return shared;
};
