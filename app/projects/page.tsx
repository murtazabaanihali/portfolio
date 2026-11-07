import type { Metadata } from "next";
import { ProjectsClientSide } from "@/components/projects";
import { getProjects } from "@/actions";

export const metadata: Metadata = {
    title: "Projects",
    description:
        "Explore the projects built by Murtaza Baanihali — web apps, mobile apps, desktop software, and more. Built with modern technologies like React, Next.js, and TypeScript.",
    alternates: {
        canonical: "/projects",
    },
    openGraph: {
        title: "Projects | Murtaza Baanihali",
        description:
            "Explore the projects built by Murtaza Baanihali — web apps, mobile apps, desktop software, and more.",
        url: "/projects",
    },
};

export default async function ProjectsPage() {
    const initialData = await getProjects(1);

    return (
        <main className="min-h-screen pt-40 md:pt-52 pb-20">
            <ProjectsClientSide initialData={initialData} />
        </main>
    );
};