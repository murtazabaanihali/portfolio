"use client";

import { Sparkles, Filter } from "lucide-react";
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
import { type getProjects } from "@/actions";
import { Button } from "@/components/ui/button";
import { PROJECT_FILTER_MAP } from "@/components/constant";
import { getImageFullURL } from "@/lib/utils";
import { useProjects } from "@/lib/swr";

interface Props {
    _data?: Awaited<ReturnType<typeof getProjects>>;
}

export const ProjectsClientSide = ({ _data }: Props) => {
    const { data, isValidating, isLoading, loadMore, tag, onTag } =
        useProjects(_data);

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
                            onClick={() => onTag(entry[0] as any)}
                        >
                            {entry[1]}
                        </Button>
                    ))}
                </div>
            </div>

            <div>
                {data?.projects?.length ? (
                    <div>
                        <div
                            id="projects"
                            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                        >
                            {data?.projects.map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/projects/${project.slug}`}
                                >
                                    <Card
                                        className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full"
                                        onClick={() =>
                                            // @ts-ignore
                                            window?.umami &&
                                            // @ts-ignore
                                            window?.umami.track(
                                                `Project Clicked: ${project.slug}`,
                                                {
                                                    title: project.title,
                                                    slug: project.slug,
                                                }
                                            )
                                        }
                                    >
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
                            {!!data.more && <Button
                                variant={"secondary"}
                                onClick={loadMore}
                                disabled={isValidating || isLoading}
                            >
                                {(isValidating || isLoading) ? "Loading..." : "Load more"}
                            </Button>}
                        </div>
                    </div>
                ) : (
                    <p className="mt-5 text-center font-semibold w-fit mx-auto">
                        {(isValidating || isLoading) ? "Loading..." : "No projects found."}
                    </p>
                )}
            </div>
        </div>
    );
};
