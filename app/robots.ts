import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/blog/config";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = siteUrl().replace(/\/$/, "");

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
