import type { Metadata } from "next";

export const revalidate = 604800; // 7 days (high TTL)

export const metadata: Metadata = {
    title: "Projects",
    description:
        "Explore the projects built by Murtaza Baanihali — web apps, mobile apps, desktop software, and more. Built with modern technologies like React, Next.js, and TypeScript.",
    alternates: {
        canonical: "/projects",
    },
    openGraph: {
        title: "Projects | Murtaza Baanihali",
        description:
            "Explore the projects built by Murtaza Baanihali — web apps, mobile apps, desktop software, and more.",
        url: "/projects",
    },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
