import { HeroSection } from "@/components/hero-section";
import { AboutSection } from "@/components/about-section";
import { Toaster } from "@/components/ui/sonner";
import ContactSection from "@/components/contact-section";

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