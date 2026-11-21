import type { Metadata } from "next";
import { getProjectBySlug } from "@/actions";
import { getImageFullURL } from "@/lib/utils";
import { siteUrl } from "@/lib/blog/config";

export const revalidate = 604800; // 7 days (high TTL)

interface ProjectPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
    const { slug } = await params;
    const project = await getProjectBySlug(slug);
    if (!project) {
        return {
            title: "Project Not Found",
        };
    }

    const title = project.title;
    const description = project.shortDescription;
    const canonical = siteUrl(`/projects/${slug}`);
    const imageUrl = getImageFullURL(project.mainImage);

    return {
        title,
        description,
        alternates: {
            canonical,
        },
        openGraph: {
            type: "website",
            title: `${title} | Murtaza Baanihali`,
            description,
            url: canonical,
            images: [
                {
                    url: imageUrl,
                    alt: project.title,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: `${title} | Murtaza Baanihali`,
            description,
            images: [imageUrl],
        },
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
