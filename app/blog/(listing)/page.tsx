"use client";

import { use } from "react";
import { Separator } from "@/components/ui/separator";
import { BlogListing } from "@/components/blog/blog-listing";

type Query = Record<string, string | string[] | undefined>;
const first = (value: Query[string]) => Array.isArray(value) ? value[0] : value;

export default function Blog({ searchParams }: { searchParams: Promise<Query> }) {
  const query = use(searchParams);
  const page = Math.max(1, Number.parseInt(first(query.page) || "1", 10) || 1);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-28 md:px-8">
      <header className="pb-6 sm:pb-8">
        <h1 className="font-serif text-3xl font-bold leading-[1.15] tracking-tight sm:text-5xl md:text-6xl">
          Notes from building software.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:mt-4 sm:text-base md:text-lg">
          Articles on engineering, building products, and the realities of
          running software businesses.
        </p>
      </header>

      <Separator className="mb-6 sm:mb-10" />

      <BlogListing
        key={JSON.stringify([query.category, query.tag, query.q, page])}
        initialCategory={first(query.category)}
        initialTag={first(query.tag)}
        initialSearch={first(query.q)}
        initialPage={page}
      />
    </main>
  );
}
