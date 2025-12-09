"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { NAVIGATION_ITEMS } from "@/components/constant";
import { cn } from "@/lib/utils";

export function Navigation() {
    const [active, setActive] = useState<string>();
    const pathname = usePathname();

    const revalidate = () => {
        const hash = window.location.pathname + window.location.hash;
        setActive(hash);
    };

    const onClick = () => {
        setTimeout(revalidate, 30);
    };

    const isActive = (href: string) => {
        return href === active;
    };

    useEffect(() => {
        if (window !== undefined) {
            setActive(window.location.pathname + window.location.hash);
        };
    }, [pathname]);

    return (
        <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4">
            <nav
                className={cn(
                    "transition-all duration-300 rounded-2xl backdrop-blur-md bg-muted/70 border border-border shadow-lg"
                )}
            >
                <div className="flex items-center justify-between px-6 py-3">
                    <Link
                        href="/"
                        className="text-xl font-bold bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent"
                    >
                        Murtaza Baanihali
                    </Link>
                    <div className="hidden md:flex items-center space-x-1">
                        {NAVIGATION_ITEMS.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={onClick}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                    isActive(item.href)
                                        ? "text-foreground bg-muted/50"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                {item.name}
                            </Link>
                        ))}
                        <div className="ml-2">
                            <ThemeToggle />
                        </div>
                    </div>
                    <div className="md:hidden flex items-center gap-2">
                        <ThemeToggle />
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[280px]">
                                <div className="flex flex-col space-y-4 mt-8">
                                    {NAVIGATION_ITEMS.map((item) => (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={onClick}
                                            className={cn(
                                                "px-4 py-3 rounded-lg text-lg font-medium transition-colors",
                                                isActive(item.href)
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            {item.name}
                                        </Link>
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
