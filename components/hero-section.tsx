import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";

export function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background/95 via-background/80 to-background/95">
            <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">
                        Available for new projects
                    </span>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                    Murtaza Baanihali
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
                    I am a full-stack developer who loves turning ideas into
                    real applications. Over the years, I have built web and
                    mobile products that focus on being simple to use and
                    flexible enough to grow with you.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link href={"/projects"}>
                        <Button
                            size="lg"
                            className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
                        >
                            View My Work
                            <ArrowUpRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                    <Link href={"#contact"}>
                        <Button
                            variant="outline"
                            size="lg"
                            className="text-lg px-8 py-6"
                        >
                            <Mail className="mr-2 h-5 w-5" />
                            Get In Touch
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
