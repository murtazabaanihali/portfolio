import Link from "next/link";
import { ArrowLeft, ShieldCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PolicyToolbar } from "./policy-toolbar";
import { PolicyMarkdown } from "./policy-markdown";
import { PolicyFooterCard } from "./policy-footer-card";
import { cn } from "@/lib/utils";

interface PolicyViewProps {
  type: "privacy" | "terms";
  content: string;
}

export function PolicyView({ type, content }: PolicyViewProps) {
  const isPrivacy = type === "privacy";

  return (
    <div className="min-h-screen pt-32 md:pt-40 pb-20">
      <PolicyToolbar />

      <div className="container mx-auto px-4 max-w-4xl">
        {/* Top bar: Back to Home + Policy Tab Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </Button>

          {/* Tab Switcher */}
          <div className="inline-flex items-center p-1 rounded-lg bg-muted/60 border border-border text-xs">
            <Button
              asChild
              variant={isPrivacy ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-8 px-3 rounded-md text-xs font-medium gap-1.5 transition-all",
                !isPrivacy && "text-muted-foreground hover:text-foreground"
              )}
            >
              <Link href="/privacy">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Privacy Policy</span>
              </Link>
            </Button>
            <Button
              asChild
              variant={!isPrivacy ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-8 px-3 rounded-md text-xs font-medium gap-1.5 transition-all",
                isPrivacy && "text-muted-foreground hover:text-foreground"
              )}
            >
              <Link href="/terms">
                <FileText className="h-3.5 w-3.5" />
                <span>Terms of Service</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Main Document Content */}
        <main className="space-y-8">
          <Card className="border bg-card/60 backdrop-blur-sm shadow-sm p-6 sm:p-10 md:p-12">
            <PolicyMarkdown content={content} />
          </Card>

          <PolicyFooterCard type={type} />
        </main>
      </div>
    </div>
  );
}
