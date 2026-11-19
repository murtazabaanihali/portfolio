import type { MetadataRoute } from "next";
import db from "@/lib/db";
import { siteUrl } from "@/lib/blog/config";
import { getBlogPostsForSitemapDB } from "@/lib/db/queries";
import { withRedisCache } from "@/lib/cache";
export const revalidate = 604800; // 7 days (high TTL)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projectsResult, blogResult] = await Promise.allSettled([
    withRedisCache("cache:sitemap:projects", 7 * 24 * 3600, () =>
      db.query.projects.findMany({ columns: { slug: true, createdAt: true, updatedAt: true } })
    ),
    withRedisCache("cache:sitemap:blogs", 7 * 24 * 3600, () =>
      getBlogPostsForSitemapDB()
    ),
  ]);

  const projects = projectsResult.status === "fulfilled" ? projectsResult.value : [];
  const posts = blogResult.status === "fulfilled" ? blogResult.value : [];

  return [
    { url: siteUrl(), changeFrequency: "weekly", priority: 1 },
    { url: siteUrl("/projects"), changeFrequency: "weekly", priority: 0.8 },
    { url: siteUrl("/privacy"), changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/terms"), changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/blog"), changeFrequency: "weekly", priority: 0.8 },
    ...projects.map(p => ({ url: siteUrl("/projects/" + p.slug),
      ...(p.updatedAt || p.createdAt ? { lastModified: (p.updatedAt || p.createdAt)! } : {}),
      changeFrequency: "monthly" as const, priority: 0.7 })),
    ...posts.map(p => ({ url: siteUrl("/blog/" + p.slug),
      lastModified: p.updatedAt ? p.updatedAt.toISOString() : (p.publishedAt ? p.publishedAt.toISOString() : undefined),
      changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
