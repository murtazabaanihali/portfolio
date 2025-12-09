import { getProjects } from "@/actions";
import { ProjectsClientSide } from "@/components/projects";

export default async function ProjectsPage() {
    const projects = await getProjects(1);

    return (
        <main className="min-h-screen pt-40 md:pt-52 pb-20">
            <ProjectsClientSide _data={projects} />
        </main>
    );
};