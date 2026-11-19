import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
    title: "Page Not Found",
    description: "The page you are looking for does not exist.",
};

export default function Custom404() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm font-semibold text-primary">404</p>
            <h1 className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight">
                Page not found
            </h1>
            <p className="mt-4 text-base text-muted-foreground max-w-md">
                Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been moved or doesn&apos;t exist.
            </p>
            <Button asChild className="mt-8">
                <Link href="/">Back to Home</Link>
            </Button>
        </div>
    );
}
