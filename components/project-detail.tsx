import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageCarousel } from "@/components/image-carousel";
import type { getProjectBySlugDB } from "@/lib/db/queries";
import { GithubIcon } from "@/components/constant";

interface ProjectDetailProps {
    project: NonNullable<Awaited<ReturnType<typeof getProjectBySlugDB>>>;
}

export function ProjectDetail({ project }: ProjectDetailProps) {
    return (
        <div className="container mx-auto px-4 max-w-4xl">
            <div className="mb-8 mt-12">
                <div className="mb-5 group inline-block cursor-pointer">
                    <Link
                        href="/projects"
                        className="flex gap-2 items-center text-sm font-medium"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Projects
                    </Link>
                    <div className="w-full h-0.5 bg-foreground rounded-full group-hover:opacity-100 opacity-0 transition-opacity" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    {project.title}
                </h1>
                <p className="text-xl text-muted-foreground">
                    {project.shortDescription}
                </p>
            </div>

            <div className="mb-12">
                <ImageCarousel images={project.images} title={project.title} />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg max-w-none">
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: project.description,
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tech Stack</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {project.techStack.map((tech) => (
                                    <Badge key={tech} variant="secondary">
                                        {tech}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Links</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {project.liveUrl && (
                                <Button asChild className="w-full">
                                    <a
                                        href={project.liveUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        View Live Site
                                    </a>
                                </Button>
                            )}
                            {project.githubUrl && (
                                <Button
                                    variant="outline"
                                    asChild
                                    className="w-full bg-transparent"
                                >
                                    <a
                                        href={project.githubUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <GithubIcon className="h-4 w-4" />
                                        View on GitHub
                                    </a>
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
