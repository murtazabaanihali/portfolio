import { categories, coverUrl, defaultAuthor, siteUrl } from "./config";
import { xml, type Entry } from "./contract";
export const publishedIndex = (posts: Entry[]) => ({
  version: 1,
  posts: posts.map(({ meta }) => ({
    ...meta, cover: { ...meta.cover, src: coverUrl(meta.cover.src) },
    url: siteUrl(`/blog/${meta.slug}`), markdown: siteUrl(`/blog/${meta.slug}/raw.md`),
  })),
});
export function rss(posts: Entry[]) {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${xml(defaultAuthor())} — Blog</title><link>${xml(siteUrl("/blog"))}</link>
<description>Engineering, AI, products, and founder notes.</description><language>en</language>
<atom:link href="${xml(siteUrl("/blog/rss.xml"))}" rel="self" type="application/rss+xml"/>
${posts.map(({ meta: p }) => `<item><title>${xml(p.title)}</title><link>${xml(siteUrl("/blog/" + p.slug))}</link><guid isPermaLink="true">${xml(siteUrl("/blog/" + p.slug))}</guid><description>${xml(p.description)}</description><pubDate>${new Date(p.publishedAt!).toUTCString()}</pubDate><category>${xml(categories.find(c => c.slug === p.category)!.name)}</category></item>`).join("")}
</channel></rss>`;
}
export const CACHE_CONTROL_MAX =
  "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";

export const discoveryHeaders = (type: string) => ({
  "Content-Type": type + "; charset=utf-8",
  "Cache-Control": CACHE_CONTROL_MAX,
  "X-Content-Type-Options": "nosniff",
});
export function unavailableResponse() {
  return new Response("Blog temporarily unavailable. Please retry.", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Retry-After": "60",
    },
  });
}
