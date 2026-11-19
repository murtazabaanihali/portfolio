import type { Metadata } from "next";

import { BlogListing } from "@/components/blog/blog-listing";
import { siteUrl } from "@/lib/blog/config";
import { getBlogPosts, getBlogCategoriesCount } from "@/actions";
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
    title: "Blog — Ideas, technology & business",
    description:
      "Blog posts on AI, technology, marketing, online business, building products, and the ideas worth talking about.",
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

  const [initialData, categoriesCount] = await Promise.all([
    getBlogPosts({
      page,
      limit: BLOG_PAGE_SIZE,
      category: query.category,
      tag: query.tag,
      search: query.q,
    }),
    getBlogCategoriesCount(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-28 sm:px-8">
      <header className="pb-8">
        <div className="flex items-center justify-between gap-6">
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Writing
          </h1>
          <a
            href="/blog/rss.xml"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
            title="RSS feed"
          >
            RSS
          </a>
        </div>
        <p className="mt-3 text-muted-foreground">
          Articles on engineering, building products, and the realities of
          running software businesses.
        </p>
      </header>

      <BlogListing
        initialData={initialData}
        categoriesCount={categoriesCount}
        initialCategory={query.category}
        initialTag={query.tag}
        initialSearch={query.q}
        initialPage={page}
      />
    </main>
  );
}
