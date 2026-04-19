import Script from "next/script";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";

const inter = Inter({ subsets: ["latin"] });

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://developer.dhem.io";

export const metadata: Metadata = {
    metadataBase: new URL(baseUrl),
    title: {
        default: "Murtaza Baanihali - Full-Stack Developer",
        template: "%s | Murtaza Baanihali",
    },
    description:
        "Full-Stack Developer with 5 years of hands-on programming experience, driven by a passion for turning complex ideas into shipped, user-centric products. Having developed a strong technical foundation since 8th grade, I specialize in end-to-end development—from initialscoping and UX to deploying scalable architectures using MERN, PERN and python based stacks. As the founder of multiple SaaS platformslike iReplyy, Dhesend, and Tajven, I bring an entrepreneurial mindset, a focus on performance, and a dedication to writing clean,maintainable code.",
    keywords: [
        "Murtaza Baanihali",
        "Full-Stack Developer",
        "Founding Engineer",
        "Web Developer",
        "Software Engineer",
        "React",
        "Next.js",
        "TypeScript",
        "Node.js",
        "Portfolio",
        "Founder",
    ],
    authors: [{ name: "Murtaza Baanihali", url: baseUrl }],
    creator: "Murtaza Baanihali",
    openGraph: {
        type: "website",
        locale: "en_US",
        url: baseUrl,
        siteName: "Murtaza Baanihali",
        title: "Murtaza Baanihali - Full-Stack Developer",
        description:
            "Building seamless experiences for web, mobile, and desktop. Specializing in high-performance applications with a focus on clean code and user-centric design.",
    },
    twitter: {
        card: "summary_large_image",
        title: "Murtaza Baanihali - Full-Stack Developer",
        description:
            "Building seamless experiences for web, mobile, and desktop. Specializing in high-performance applications with a focus on clean code and user-centric design.",
        creator: "@murtazabaanihali",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    alternates: {
        canonical: baseUrl,
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <Script
                async
                src="/tk.js"
                data-website-id={process.env.ANALYTICS_WEBSITE_ID}
            />
            <body className={inter.className}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                >
                    <Navigation />
                    {children}
                    <Footer />
                </ThemeProvider>
            </body>
        </html>
    );
}
