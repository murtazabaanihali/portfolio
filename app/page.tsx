import type { Metadata } from "next";
import { HeroSection } from "@/components/hero-section";
import { AboutSection } from "@/components/about-section";
import { Toaster } from "@/components/ui/sonner";
import ContactSection from "@/components/contact-section";

export const metadata: Metadata = {
    title: "Home",
    description:
        "Welcome to the portfolio of Murtaza Baanihali — a full-stack developer building seamless experiences for web, mobile, and desktop.",
    alternates: {
        canonical: "/",
    },
    openGraph: {
        title: "Murtaza Baanihali - Full-Stack Developer",
        description:
            "Building seamless experiences for web, mobile, and desktop. Specializing in high-performance applications with a focus on clean code and user-centric design.",
        url: "/",
    },
};

export default function HomePage() {
    return (
        <main className="min-h-screen">
            <HeroSection />
            <AboutSection />
            <ContactSection />
            <Toaster richColors />
        </main>
    );
};