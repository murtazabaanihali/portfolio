import { ProjectDetail } from "@/components/project-detail";

interface ProjectPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const { slug } = await params;
    return (
        <main className="min-h-screen pt-24 pb-20">
            <ProjectDetail slug={slug} />
        </main>
    );
}
