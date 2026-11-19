import Link from "next/link";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NAVIGATION_ITEMS, SOCIAL_LINKS } from "@/components/constant";

export function Footer() {
    return (
        <footer className="border-t border-border bg-card/40">
            <div className="container mx-auto px-4 py-12 max-w-6xl">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-8">
                    <div>
                        <Link
                            href="/"
                            className="block text-lg font-bold tracking-tight text-foreground hover:text-foreground/80 transition-colors"
                        >
                            Murtaza Baanihali
                        </Link>
                        <p className="text-muted-foreground mt-2 max-w-xs text-sm">
                            Full-stack developer &amp; founder.
                        </p>
                    </div>

                    <nav className="flex flex-col gap-1.5" aria-label="Footer Menu">
                        <span className="text-xs uppercase text-muted-foreground font-semibold mb-1 tracking-wider">
                            Menu
                        </span>
                        {NAVIGATION_ITEMS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </nav>

                    <nav className="flex flex-col gap-1.5" aria-label="Legal">
                        <span className="text-xs uppercase text-muted-foreground font-semibold mb-1 tracking-wider">
                            Legal
                        </span>
                        <Link
                            href="/privacy"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            href="/terms"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Terms of Service
                        </Link>
                    </nav>

                    <div>
                        <span className="text-xs uppercase text-muted-foreground font-semibold mb-2 block tracking-wider">
                            Connect
                        </span>
                        <div className="flex gap-1.5">
                            {SOCIAL_LINKS.map((item, i) => (
                                <Button
                                    key={i}
                                    asChild
                                    variant="outline"
                                    size="icon"
                                    data-umami-event={item.title}
                                >
                                    <a
                                        href={item.link}
                                        title={item.title}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <item.icon className="size-4" />
                                    </a>
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <Separator className="my-8" />

                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-muted-foreground text-xs">
                    <span>
                        &copy; {new Date().getFullYear()} Murtaza Baanihali. All rights reserved.
                    </span>
                    <span className="flex items-center gap-1">
                        Made with{" "}
                        <Heart className="size-3.5 text-red-500 fill-current" />{" "}
                        by me.
                    </span>
                </div>
            </div>
        </footer>
    );
}
