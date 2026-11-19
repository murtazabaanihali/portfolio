"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyLink({
  url,
  label = "Share",
}: {
  url: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      aria-live="polite"
      className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground"
    >
      {copied ? (
        <Check className="size-3.5 text-primary" />
      ) : (
        <Link2 className="size-3.5" />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}
