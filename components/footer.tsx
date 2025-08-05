import Link from "next/link";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NAVIGATION_ITEMS, SOCIAL_LINKS } from "@/components/constant";

export function Footer() {
    return (
        <footer className="bg-muted/30 border-t">
            <div className="container mx-auto px-4 py-10">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-8">
                    <div>
                        <Link
                            href="/"
                            className="block text-xl font-extrabold bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent"
                        >
                            Murtaza Baanihali
                        </Link>
                        <p className="text-muted-foreground mt-2 max-w-xs text-sm">
                            Full-stack developer passionate about exceptional
                            digital experiences, AI, and modern tech.
                        </p>
                    </div>

                    <nav className="mt-6 md:mt-0 flex flex-col gap-1">
                        <span className="text-xs uppercase text-muted-foreground font-medium mb-1">
                            Menu
                        </span>
                        {NAVIGATION_ITEMS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="hover:text-foreground text-muted-foreground transition-colors"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </nav>

                    <div className="mt-6 md:mt-0">
                        <span className="text-xs uppercase text-muted-foreground font-medium mb-1">
                            Connect
                        </span>
                        <div className="flex gap-2">
                            {SOCIAL_LINKS.map((item, i) => (
                                <a
                                    key={i}
                                    href={item.link}
                                    title={item.title}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-full hover:bg-muted"
                                    >
                                        <item.icon />
                                    </Button>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="border-t mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-2 text-muted-foreground text-xs">
                    <span>
                        &copy; {new Date().getFullYear()} Murtaza Baanihali. All
                        rights reserved.
                    </span>
                    <span className="flex items-center gap-1">
                        Made with{" "}
                        <Heart className="h-4 w-4 text-red-500 fill-current" />{" "}
                        using Next.js
                    </span>
                </div>
            </div>
        </footer>
    );
};