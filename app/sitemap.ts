import type { MetadataRoute } from "next";
import db from "@/lib/db";
import { siteUrl } from "@/lib/blog/config";
import { getPublished } from "@/lib/blog/store";
import { withRedisCache } from "@/lib/cache";
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projectsResult, blogResult] = await Promise.allSettled([
    withRedisCache("cache:sitemap:projects", 3600, () =>
      db.query.projects.findMany({ columns: { slug: true, createdAt: true, updatedAt: true } })
    ),
    getPublished(),
  ]);

  const projects = projectsResult.status === "fulfilled" ? projectsResult.value : [];
  const posts = blogResult.status === "fulfilled" ? blogResult.value.posts : [];

  return [
    { url: siteUrl(), changeFrequency: "weekly", priority: 1 },
    { url: siteUrl("/projects"), changeFrequency: "weekly", priority: 0.8 },
    { url: siteUrl("/privacy"), changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/terms"), changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/blog"), changeFrequency: "weekly", priority: 0.8 },
    ...projects.map(p => ({ url: siteUrl("/projects/" + p.slug),
      ...(p.updatedAt || p.createdAt ? { lastModified: (p.updatedAt || p.createdAt)! } : {}),
      changeFrequency: "monthly" as const, priority: 0.7 })),
    ...posts.map(({ meta: p }) => ({ url: siteUrl("/blog/" + p.slug),
      lastModified: p.updatedAt || p.publishedAt!, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
