"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

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
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
    >
      {copied ? (
        <Check className="size-3.5 text-primary" />
      ) : (
        <Link2 className="size-3.5" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
