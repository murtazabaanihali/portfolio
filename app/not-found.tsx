import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Page Not Found",
    description: "The page you are looking for does not exist.",
};

export default function Custom404() {
    return (
        <div className="h-[500px] grid place-items-center">
            <h1 className="text-center text-5xl font-bold">404 - Page Not Found</h1>
        </div>
    );
};