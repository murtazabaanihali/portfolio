"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-28 sm:px-8">
      <p className="text-sm font-medium text-primary">Unavailable</p>
      <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight">
        Articles are temporarily unavailable
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        This is a temporary loading problem, not a missing article. Please try
        again shortly.
      </p>
      <Button onClick={reset} className="mt-8">
        Try again
      </Button>
    </main>
  );
}
