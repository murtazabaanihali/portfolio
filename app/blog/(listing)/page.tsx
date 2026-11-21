import type { Metadata } from "next";

import { Separator } from "@/components/ui/separator";
import { BlogListing } from "@/components/blog/blog-listing";
import { siteUrl } from "@/lib/blog/config";
import { getBlogPosts } from "@/actions";
import { BLOG_PAGE_SIZE } from "@/lib/constants";

export const revalidate = 604800; // 7 days (high TTL)
type Query = { q?: string; category?: string; tag?: string; page?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  const p = await searchParams;
  return {
    title: "Blog — Notes from building software",
    description:
      "Articles on engineering, building products, and the realities of running software businesses.",
    alternates: {
      canonical: siteUrl("/blog"),
      types: { "application/rss+xml": siteUrl("/blog/rss.xml") },
    },
    robots:
      p.q || p.category || p.tag || p.page
        ? { index: false, follow: true }
        : undefined,
    openGraph: { title: "Blog", url: siteUrl("/blog"), type: "website" },
  };
}

export default async function Blog({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page || "1", 10) || 1);

  const initialData = await getBlogPosts({
    page,
    limit: BLOG_PAGE_SIZE,
    category: query.category,
    tag: query.tag,
    search: query.q,
  });

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
        initialData={initialData}
        initialCategory={query.category}
        initialTag={query.tag}
        initialSearch={query.q}
        initialPage={page}
      />
    </main>
  );
}
