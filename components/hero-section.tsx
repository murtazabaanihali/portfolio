import Link from "next/link";
import { ArrowUpRight, Download, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getImageFullURL } from "@/lib/utils";

export function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center">
            <div className="relative z-10 text-center px-4 max-w-5xl mx-auto py-24">
                <Badge variant="outline" className="gap-2 px-3.5 py-1.5 mb-8">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs sm:text-sm font-medium">Available for new projects</span>
                </Badge>

                <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6">
                    Murtaza Baanihali
                </h1>

                <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
                    I am a full-stack developer who loves turning ideas into real applications. Over
                    the years, I have built web and mobile products that focus on being simple to
                    use and flexible enough to grow with you. Along with full-stack development, I am also
                    the founder of projects like Thesis Maker, iReplyy, Dhesend, and DheGEN.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button asChild size="lg">
                        <Link href="/projects">
                            View My Work
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="#contact">
                            <Mail className="mr-2 h-4 w-4" />
                            Get In Touch
                        </Link>
                    </Button>
                </div>
                <div className="mx-auto mt-6">
                    <Button asChild variant="link" size="sm">
                        <Link href={getImageFullURL("0001-Murtaza-Baanihali-Resume-Final.pdf")} target="_blank">
                            <Download className="mr-2 h-4 w-4" />
                            Download My Resume
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
