"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PolicyToolbar() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Top reading progress indicator */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] bg-primary/20 z-[60] pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-gradient-to-r from-primary to-purple-500 transition-[width] duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Floating scroll to top button */}
      <div
        className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ${
          showScrollTop
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <Button
          size="icon"
          variant="secondary"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="rounded-full shadow-lg border border-border/80 bg-background/90 backdrop-blur-md hover:bg-muted text-foreground size-10"
        >
          <ChevronUp className="h-5 w-5" />
        </Button>
      </div>
    </>
  );
}
