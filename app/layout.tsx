import Script from "next/script";
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { siteUrl } from "@/lib/blog/config";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({
    subsets: ["latin"],
    variable: "--font-serif",
    display: "swap",
});

const baseUrl = siteUrl();
const themeStorageKey = "theme";

// Keep this as a literal: the Cloudflare bundle adds helpers to next-themes'
// serialized function that aren't available when it runs in the browser.
const themeInitScript = `
    (() => {
        let theme;
        try {
            theme = localStorage.getItem(${JSON.stringify(themeStorageKey)});
        } catch {}
        if (theme !== "light" && theme !== "dark") {
            theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
        document.documentElement.classList.add(theme);
        document.documentElement.style.colorScheme = theme;
    })();
`;

export const metadata: Metadata = {
    metadataBase: new URL(baseUrl),
    title: {
        default: "Murtaza Baanihali - Full-Stack Developer",
        template: "%s | Murtaza Baanihali",
    },
    description:
        "Full-Stack Developer with 5 years of hands-on programming experience, driven by a passion for turning complex ideas into shipped, user-centric products. Having developed a strong technical foundation since 8th grade, I specialize in end-to-end development—from initial scoping and UX to deploying scalable architectures using MERN, PERN, and Python-based stacks. As the founder of multiple SaaS platforms like Thesis Maker, iReplyy, Dhesend, and DheGEN, I bring an entrepreneurial mindset, a focus on performance, and a dedication to writing clean, maintainable code.",
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
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
            </head>
            {process.env.ANALYTICS_WEBSITE_ID && (
                <Script
                    async
                    src="/tk.js"
                    data-website-id={process.env.ANALYTICS_WEBSITE_ID}
                />
            )}
            <body className={`${inter.variable} ${playfair.variable} font-sans`}>
                <ThemeProvider
                    attribute="class"
                    storageKey={themeStorageKey}
                    defaultTheme="system"
                    enableSystem
                    scriptProps={{ type: "text/plain" }}
                >
                    <Navigation />
                    {children}
                    <Footer />
                </ThemeProvider>
            </body>
        </html>
    );
}
