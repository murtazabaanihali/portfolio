"use client";

import { Filter } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { PROJECT_FILTER_MAP } from "@/components/constant";
import { getImageFullURL } from "@/lib/utils";
import { ProjectGridSkeleton } from "./project-skeletons";
import { useProjects } from "@/swr/projects";
import { trackUmamiEvent } from "@/lib/analytics";
import type { ProjectTag } from "@/lib/db/schema";

export const ProjectsClientSide = () => {
    const { data, error, isValidating, isLoadingMore, isLoading, loadMore, tag, onTag } = useProjects();
    if (error) return <p role="alert">Could not load projects.</p>;

    return (
        <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16">
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
                    My Projects
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                    A collection of projects showcasing my expertise in
                    full-stack development, from web applications to mobile
                    solutions and AI-powered platforms.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    <Button
                        variant={!tag ? "default" : "outline"}
                        size="sm"
                        onClick={() => onTag(undefined)}
                    >
                        <Filter className="h-4 w-4" />
                        All Projects
                    </Button>
                    {Object.entries(PROJECT_FILTER_MAP).map(([filterTag, label]) => (
                        <Button
                            key={filterTag}
                            size="sm"
                            variant={tag === filterTag ? "default" : "outline"}
                            onClick={() => onTag(filterTag as ProjectTag)}
                        >
                            {label}
                        </Button>
                    ))}
                </div>
            </div>

            <div>
                {isLoading && !data.projects ? (
                    <ProjectGridSkeleton />
                ) : data.projects?.length ? (
                    <div>
                        <div
                            id="projects"
                            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {data.projects.map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/projects/${project.slug}`}
                                    className="group block h-full"
                                    onClick={() => {
                                        try {
                                            trackUmamiEvent(
                                                `Project Clicked: ${project.slug}`,
                                                {
                                                    title: project.title,
                                                    slug: project.slug,
                                                },
                                            );
                                        } catch (error) {
                                            console.warn("Umami tracking error:", error);
                                        }
                                    }}
                                >
                                    <Card className="h-full overflow-hidden transition-colors hover:border-foreground/30 flex flex-col">
                                        <div className="aspect-video relative overflow-hidden bg-muted">
                                            <Image
                                                src={getImageFullURL(
                                                    project.mainImage,
                                                    "/placeholder.svg?height=300&width=400&query=project-screenshot",
                                                )}
                                                alt={project.title}
                                                fill
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        </div>
                                        <CardHeader className="flex-1 pb-3">
                                            <CardTitle className="transition-colors group-hover:text-primary">
                                                {project.title}
                                            </CardTitle>
                                            <CardDescription className="line-clamp-2">
                                                {project.shortDescription}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="flex flex-wrap gap-1.5">
                                                {project.techStack
                                                    .slice(0, 3)
                                                    .map((tech) => (
                                                        <Badge
                                                            key={tech}
                                                            variant="secondary"
                                                        >
                                                            {tech}
                                                        </Badge>
                                                    ))}
                                                {project.techStack.length > 3 && (
                                                    <Badge variant="outline">
                                                        +{project.techStack.length - 3} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                        <div className="mt-12 flex justify-center">
                            {!!data.more && (
                                <Button
                                    variant="secondary"
                                    onClick={loadMore}
                                    disabled={isValidating || isLoadingMore}
                                >
                                    {isLoadingMore
                                        ? "Loading more projects…"
                                        : "Load more"}
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <p role="status" className="mt-8 text-center text-muted-foreground">
                        No projects found.
                    </p>
                )}
            </div>
        </div>
    );
};
