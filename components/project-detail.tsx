"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageCarousel } from "@/components/image-carousel";
import { GithubIcon } from "@/components/constant";
import { useProjectDetails } from "@/lib/swr";
import Custom404 from "@/app/not-found";

interface ProjectDetailProps {
    slug: string;
}

export function ProjectDetail({ slug }: ProjectDetailProps) {
    const { data: project, isLoading } = useProjectDetails(slug);

    return (
        <div className="container mx-auto px-4 max-w-4xl">
            {isLoading ? (
                <div className="flex justify-center p-6 pt-40">
                    <Loader2 className="size-10 animate-spin text-muted-foreground" />
                </div>
            ) : !project ? (
                <Custom404 />
            ) : (
                <>
                    <div className="mb-8 mt-12">
                        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
                            <Link href="/projects">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Projects
                            </Link>
                        </Button>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3">
                            {project.title}
                        </h1>
                        <p className="text-lg sm:text-xl text-muted-foreground">
                            {project.shortDescription}
                        </p>
                    </div>

                    <div className="mb-12">
                        <ImageCarousel
                            images={project.images}
                            title={project.title}
                        />
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Project Overview</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-base sm:text-lg leading-relaxed space-y-4">
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
                                            <Badge
                                                key={tech}
                                                variant="secondary"
                                            >
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
                                            className="w-full"
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
                </>
            )}
        </div>
    );
}
