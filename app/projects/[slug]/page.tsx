import { notFound } from "next/navigation";
import { Metadata } from "next";

import { getProjectBySlug } from "@/actions";
import { ProjectDetail } from "@/components/project-detail";
import { getImageFullURL } from "@/lib/utils";

interface ProjectPageProps {
    params: {
        slug: string;
    };
}

export async function generateMetadata({
    params,
}: ProjectPageProps): Promise<Metadata> {
    const project = await getProjectBySlug(params.slug);

    if (!project) {
        return {
            title: "Project Not Found",
            description: "The requested project could not be found.",
        };
    };

    return {
        title: `${project.title} - Murtaza Baanihali's Portfolio`,
        description: project.shortDescription,
        openGraph: {
            title: `${project.title} - Murtaza Baanihali's Portfolio`,
            description: project.shortDescription,
            images: [
                {
                    url: getImageFullURL(project.mainImage),
                    width: 1200,
                    height: 630,
                    alt: project.title,
                },
            ],
            type: "article",
        },
        twitter: {
            card: "summary_large_image",
            title: `${project.title} - Murtaza Baanihali's Portfolio`,
            description: project.shortDescription,
            images: [
                getImageFullURL(project.mainImage),
            ],
        },
    };
};

export default async function ProjectPage({ params }: ProjectPageProps) {
    const project = await getProjectBySlug(params.slug);

    if (!project) {
        notFound();
    };

    return (
        <main className="min-h-screen pt-24 pb-20">
            <ProjectDetail project={project} />
        </main>
    );
};
