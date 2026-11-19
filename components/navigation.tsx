"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { NAVIGATION_ITEMS } from "@/components/constant";

export function Navigation() {
    const [currentHash, setCurrentHash] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const onClick = () => {
        setTimeout(() => {
            if (typeof window !== "undefined") {
                setCurrentHash(window.location.hash);
            }
        }, 30);
    };

    const isActive = (href: string) => {
        const full = pathname + currentHash;
        return (
            href === full ||
            (href === "/" && pathname === "/" && !currentHash) ||
            (href === "/blog" && pathname.startsWith("/blog/"))
        );
    };

    useEffect(() => {
        const handleHash = () => setCurrentHash(window.location.hash);
        window.addEventListener("hashchange", handleHash);
        return () => window.removeEventListener("hashchange", handleHash);
    }, []);

    return (
        <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4">
            <nav className="rounded-full border border-border bg-background/80 backdrop-blur-md shadow-sm">
                <div className="flex items-center justify-between px-4 sm:px-6 py-2.5">
                    <Link
                        href="/"
                        className="text-base sm:text-lg font-bold tracking-tight text-foreground transition-colors hover:text-foreground/80"
                    >
                        Murtaza Baanihali
                    </Link>
                    <div className="hidden md:flex items-center gap-1">
                        {NAVIGATION_ITEMS.map((item) => (
                            <Button
                                key={item.name}
                                asChild
                                variant={isActive(item.href) ? "secondary" : "ghost"}
                                size="sm"
                                onClick={onClick}
                            >
                                <Link href={item.href}>{item.name}</Link>
                            </Button>
                        ))}
                        <div className="ml-1 pl-1 border-l border-border">
                            <ThemeToggle />
                        </div>
                    </div>
                    <div className="md:hidden flex items-center gap-1">
                        <ThemeToggle />
                        <Sheet open={isOpen} onOpenChange={setIsOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Open menu">
                                    <Menu className="size-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[280px]">
                                <div className="flex flex-col space-y-2 mt-8">
                                    {NAVIGATION_ITEMS.map((item) => (
                                        <Button
                                            key={item.name}
                                            asChild
                                            variant={isActive(item.href) ? "secondary" : "ghost"}
                                            className="w-full justify-start text-base"
                                            onClick={() => {
                                                onClick();
                                                setIsOpen(false);
                                            }}
                                        >
                                            <Link href={item.href}>{item.name}</Link>
                                        </Button>
                                    ))}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </nav>
        </header>
    );
}
