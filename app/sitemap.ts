import type { MetadataRoute } from "next";
import db from "@/lib/db";
import { siteUrl } from "@/lib/blog/config";
import { getBlogPostsForSitemapDB } from "@/lib/db/queries";
import { withRedisCache } from "@/lib/cache";

// Fresh DB rows have Dates; Redis returns their JSON-serialized ISO strings.
type SitemapDate = Date | string | null;
type SitemapProject = { slug: string; createdAt: SitemapDate; updatedAt: SitemapDate };
type SitemapPost = { slug: string; publishedAt: SitemapDate; updatedAt: SitemapDate };

export const revalidate = 604800; // 7 days (high TTL)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projectsResult, blogResult] = await Promise.allSettled([
    withRedisCache<SitemapProject[]>("cache:sitemap:projects", revalidate, () =>
      db.query.projects.findMany({ columns: { slug: true, createdAt: true, updatedAt: true } })
    ),
    withRedisCache<SitemapPost[]>("cache:sitemap:blogs", revalidate, () =>
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
    ...projects.map(p => ({
      url: siteUrl("/projects/" + p.slug),
      lastModified: p.updatedAt ?? p.createdAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...posts.map(p => ({
      url: siteUrl("/blog/" + p.slug),
      lastModified: p.updatedAt ?? p.publishedAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
