"use client";

import { Sparkles, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/lib/db/queries";
import { getProjects } from "@/actions";
import { Button } from "@/components/ui/button";
import { PROJECT_FILTER_MAP } from "@/components/constant";
import { getImageFullURL } from "@/lib/utils";

interface Props {
    projects?: {
        projects?: Project[] | null;
        more: boolean;
    } | null;
}

export const ProjectsClientSide = ({ projects }: Props) => {
    const [_projects, setProjects] = useState(projects?.projects);
    const [pageNumber, setPageNumber] = useState(1);
    const [loading, setLoading] = useState(true);
    const [tag, setTag] = useState<string>();

    const loadMore = async () => {
        if (loading || pageNumber === 0) return;
        setLoading(true);

        const more = await getProjects(pageNumber, tag as any);
        setProjects((prev) => [...(prev?.concat(more?.projects || []) || [])]);
        setPageNumber((prev) => (more?.more ? prev + 1 : 0));
        setLoading(false);
    };

    const onTag = (tag?: string) => {
        setPageNumber(1);
        setProjects([]);
        setTag(tag);
    };

    useEffect(() => {
        setLoading(false);
        if (!projects?.more) setPageNumber(0);
    }, []);

    useEffect(() => {
        loadMore();
    }, [tag]);

    return (
        <div className="container mx-auto px-4">
            <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Featured Work</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    My Projects
                </h1>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                    A collection of projects showcasing my expertise in
                    full-stack development, from web applications to mobile
                    solutions and AI-powered platforms.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    <Button
                        variant={!tag ? "default" : "ghost"}
                        size="sm"
                        className="rounded-full"
                        onClick={() => onTag()}
                    >
                        <Filter className="h-4 w-4" />
                        All Projects
                    </Button>
                    {Object.entries(PROJECT_FILTER_MAP).map((entry, key) => (
                        <Button
                            key={key}
                            size="sm"
                            variant={tag === entry[0] ? "default" : "ghost"}
                            className="rounded-full"
                            onClick={() => onTag(entry[0])}
                        >
                            {entry[1]}
                        </Button>
                    ))}
                </div>
            </div>

            <div>
                {_projects?.length ? (
                    <div>
                        <div
                            id="projects"
                            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                        >
                            {_projects.map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/projects/${project.slug}`}
                                >
                                    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                                        <div className="aspect-video relative overflow-hidden rounded-t-lg">
                                            <Image
                                                src={getImageFullURL(
                                                    project.mainImage,
                                                    "/placeholder.svg?height=300&width=400&query=project-screenshot"
                                                )}
                                                alt={project.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                        <CardHeader>
                                            <CardTitle className="group-hover:text-primary transition-colors mb-2">
                                                {project.title}
                                            </CardTitle>
                                            <CardDescription className="line-clamp-2">
                                                {project.shortDescription}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {project.techStack
                                                    .slice(0, 3)
                                                    .map((tech) => (
                                                        <Badge
                                                            key={tech}
                                                            variant="outline"
                                                            className="text-xs"
                                                        >
                                                            {tech}
                                                        </Badge>
                                                    ))}
                                                {project.techStack.length >
                                                    3 && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                    >
                                                        +
                                                        {project.techStack
                                                            .length - 3}{" "}
                                                        more
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                        <div className="mt-8 mx-auto flex justify-center">
                            {pageNumber !== 0 && <Button
                                variant={"secondary"}
                                onClick={loadMore}
                                disabled={loading || pageNumber === 0}
                            >
                                {loading ? "Loading..." : "Load more"}
                            </Button>}
                        </div>
                    </div>
                ) : (
                    <p className="mt-5 text-center font-semibold w-fit mx-auto">
                        {loading ? "Loading..." : "No projects found."}
                    </p>
                )}
            </div>
        </div>
    );
};
