import type { MetadataRoute } from "next";
import { getProjects } from "@/actions";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://developer.dhem.io";

    const { projects } = await getProjects(1);

    const projectEntries: MetadataRoute.Sitemap =
        projects?.map((project) => ({
            url: `${baseUrl}/projects/${project.slug}`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.7,
        })) ?? [];

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 1,
        },
        {
            url: `${baseUrl}/projects`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
        },
        ...projectEntries,
    ];
}
