import "server-only";
import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { HEAD_KEY, MANIFEST_KEY } from "./config";
import { headSchema, manifestSchema, parsePost, serializePost, type Entry } from "./contract";
import { withRedisCache } from "@/lib/cache";
import db from "@/lib/db";
import { blogPosts } from "@/lib/db/blog-schema";
import { getBlogPostBySlugDB, blogPostToPost } from "@/lib/db/queries";
import { eq, desc } from "drizzle-orm";

const BLOG_CACHE_TTL = 7 * 24 * 3600; // 7 days (high TTL)

interface ContentBucket { get(key: string): Promise<{ text(): Promise<string> } | null> }
export class BlogUnavailable extends Error {
  constructor() { super("Blog content is temporarily unavailable. Please try again shortly."); }
}
async function read(key: string) {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as unknown as { BLOG_CONTENT?: ContentBucket }).BLOG_CONTENT;
  if (!bucket) throw new Error("BLOG_CONTENT binding is missing");
  return bucket.get(key);
}

export const getPublished = cache(async () => {
  return withRedisCache("cache:blog:manifest", BLOG_CACHE_TTL, async () => {
    try {
      const rows = await db.query.blogPosts.findMany({
        where: eq(blogPosts.status, "published"),
        orderBy: [desc(blogPosts.publishedAt)],
      });
      if (rows && rows.length > 0) {
        return {
          version: 1 as const,
          posts: rows.map(p => ({
            key: p.contentKey,
            meta: blogPostToPost(p),
            revision: p.revision,
            assets: [] as string[],
          })),
        };
      }
    } catch (e) {
      console.warn("DB manifest query failed, falling back to R2 manifest:", e);
    }

    try {
      const directManifest = await read(MANIFEST_KEY);
      if (directManifest) {
        return manifestSchema.parse(JSON.parse(await directManifest.text()));
      }
      const object = await read(HEAD_KEY);
      if (!object) throw new Error("Blog has not been initialized (manifest or active head missing)");
      const head = headSchema.parse(JSON.parse(await object.text()));
      const manifest = await read(head.manifest);
      if (!manifest) throw new Error("Active manifest missing");
      return manifestSchema.parse(JSON.parse(await manifest.text()));
    } catch (error) { console.error("Blog manifest read failed", error); throw new BlogUnavailable(); }
  });
});

export const getArticle = cache(async (slug: string) => {
  return withRedisCache(`cache:blog:article:${slug}`, BLOG_CACHE_TTL, async () => {
    try {
      const dbPost = await getBlogPostBySlugDB(slug);
      if (dbPost?.contentKey) {
        const object = await read(dbPost.contentKey);
        if (object) {
          const raw = await object.text();
          const parsed = parsePost(raw);
          return {
            meta: dbPost,
            body: parsed.body,
            raw,
          };
        }
      }
    } catch (e) {
      console.warn("DB article lookup failed, falling back to manifest:", e);
    }

    const { posts } = await getPublished();
    const entry = posts.find(p => p.meta.slug === slug);
    if (!entry) return null;
    try {
      const object = await read(entry.key);
      if (!object) throw new Error("Active article missing");
      const raw = await object.text();
      const parsed = parsePost(raw);
      if (JSON.stringify(parsed.meta) !== JSON.stringify(entry.meta)) throw new Error("Article/manifest mismatch");
      return { ...parsed, raw: serializePost(parsed.meta, parsed.body), entry };
    } catch (error) { console.error("Blog article read failed", error); throw new BlogUnavailable(); }
  });
});
export const sortedPosts = (posts: Entry[]) => [...posts].sort((a, b) =>
  Date.parse(b.meta.publishedAt!) - Date.parse(a.meta.publishedAt!) || a.meta.slug.localeCompare(b.meta.slug));
