import type { MetadataRoute } from "next";
import db from "@/lib/db";
import { siteUrl } from "@/lib/blog/config";
import { getPublished } from "@/lib/blog/store";
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Read all project slugs, not just the first listing page. Fail on upstream errors
  // rather than serving an apparently complete sitemap with silently dropped URLs.
  const [projects, { posts }] = await Promise.all([
    db.query.projects.findMany({ columns: { slug: true, createdAt: true, updatedAt: true } }),
    getPublished(),
  ]);
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
