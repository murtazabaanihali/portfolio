import "server-only";
import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { HEAD_KEY } from "./config";
import { headSchema, manifestSchema, parsePost, serializePost, type Entry } from "./contract";

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
// React cache deduplicates only within a server render; there is no ISR, process TTL,
// fetch cache, CDN JSON cache, or stale-on-error layer in the published read path.
export const getPublished = cache(async () => {
  try {
    const object = await read(HEAD_KEY);
    if (!object) throw new Error("Blog has not been initialized (active head missing)");
    const head = headSchema.parse(JSON.parse(await object.text()));
    const manifest = await read(head.manifest);
    if (!manifest) throw new Error("Active manifest missing");
    return manifestSchema.parse(JSON.parse(await manifest.text()));
  } catch (error) { console.error("Blog manifest read failed", error); throw new BlogUnavailable(); }
});
export const getArticle = cache(async (slug: string) => {
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
export const sortedPosts = (posts: Entry[]) => [...posts].sort((a, b) =>
  Date.parse(b.meta.publishedAt!) - Date.parse(a.meta.publishedAt!) || a.meta.slug.localeCompare(b.meta.slug));
