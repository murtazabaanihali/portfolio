import Link from "next/link";
import { Shield, FileText, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PolicyFooterCardProps {
  type: "privacy" | "terms";
}

export function PolicyFooterCard({ type }: PolicyFooterCardProps) {
  const isPrivacy = type === "privacy";

  return (
    <div className="mt-8">
      {/* Switch to companion document Card */}
      <Card className="border bg-muted/20 border-dashed">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              {isPrivacy ? (
                <>
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Looking for our Terms of Service?</span>
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Looking for our Privacy Policy?</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isPrivacy
                ? "Review the contract rules, acceptable use, academic data warranties, and arbitration terms."
                : "Learn how we protect your personal data, manage AI processing, and enforce cookieless telemetry."}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
            <Link href={isPrivacy ? "/terms" : "/privacy"}>
              <span>{isPrivacy ? "Read Terms of Service" : "Read Privacy Policy"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
