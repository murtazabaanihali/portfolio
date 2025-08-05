import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Murtaza Baanihali - Full-Stack Developer",
    description:
        "Building seamless experiences for web, mobile, and desktop. Specializing in high-performance applications with a focus on clean code and user-centric design.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <Navigation />
                    {children}
                    <Footer />
                </ThemeProvider>
            </body>
        </html>
    );
};