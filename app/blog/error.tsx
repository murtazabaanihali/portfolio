"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-3xl px-5 pb-24 pt-32"><h1 className="text-3xl font-bold">Articles are temporarily unavailable</h1><p className="my-5 text-muted-foreground">This is a temporary loading problem, not a missing article. Please try again shortly.</p><button onClick={reset} className="rounded-lg bg-primary px-5 py-3 text-primary-foreground">Try again</button></main>;
}
