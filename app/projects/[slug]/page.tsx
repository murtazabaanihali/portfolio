import { ProjectDetail } from "@/components/project-detail";

interface ProjectPageProps {
    params: {
        slug: string;
    };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    return (
        <main className="min-h-screen pt-24 pb-20">
            <ProjectDetail slug={params.slug} />
        </main>
    );
};
