"use client";

import { use } from "react";
import { ProjectDetail } from "@/components/project-detail";

export default function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    return (
        <main className="min-h-screen pt-24 pb-20">
            <ProjectDetail slug={slug} />
        </main>
    );
}
