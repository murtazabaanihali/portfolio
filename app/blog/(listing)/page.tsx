import type { Metadata } from "next";
import Link from "next/link";
import { Search, X } from "lucide-react";

import { FeaturedPost } from "@/components/blog/featured-post";
import { PostRow } from "@/components/blog/post-row";
import { categories, siteUrl } from "@/lib/blog/config";
import { sortedPosts, getPublished } from "@/lib/blog/store";

export const dynamic = "force-dynamic";
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

const PAGE_SIZE = 11;

export default async function Blog({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const { posts } = await getPublished();
  const q = (query.q || "").slice(0, 200).toLowerCase();
  const filtered = sortedPosts(posts).filter(
    ({ meta: p }) =>
      (!query.category || p.category === query.category) &&
      (!query.tag || p.tags.includes(query.tag)) &&
      (!q ||
        [
          p.title,
          p.description,
          p.author,
          categories.find((c) => c.slug === p.category)?.name,
          ...p.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(
    pages,
    Math.max(1, Number.parseInt(query.page || "1", 10) || 1),
  );
  const featured =
    !q && !query.category && !query.tag && page === 1 ? filtered[0] : undefined;
  const listed = featured
    ? filtered.slice(1, PAGE_SIZE)
    : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeCategory = categories.find((c) => c.slug === query.category);
  const clearHref = "/blog";

  const pageUrl = (n: number) => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.category) params.set("category", query.category);
    if (query.tag) params.set("tag", query.tag);
    params.set("page", String(n));
    return "/blog?" + params;
  };

  const countFor = (slug: string) =>
    posts.filter((p) => p.meta.category === slug).length;

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
          {posts.length} articles on engineering, building products, and the
          realities of running software businesses.
        </p>
      </header>

      <div className="flex flex-col gap-3 border-y border-border py-4">
        <form
          action="/blog"
          method="get"
          role="search"
          className="relative w-full sm:max-w-xs"
        >
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            name="q"
            defaultValue={query.q}
            maxLength={200}
            placeholder="Search articles…"
            aria-label="Search posts"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          {query.category && (
            <input type="hidden" name="category" value={query.category} />
          )}
          {query.tag && <input type="hidden" name="tag" value={query.tag} />}
        </form>
        <nav
          aria-label="Blog categories"
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]"
        >
          <Link
            href={clearHref}
            aria-current={!query.category && !query.tag ? "page" : undefined}
            className={
              "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors " +
              (!query.category && !query.tag
                ? "border-primary/40 bg-primary/10 font-medium text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground")
            }
          >
            All
          </Link>
          {categories
            .filter((c) => posts.some((p) => p.meta.category === c.slug))
            .map((c) => (
              <Link
                key={c.slug}
                href={`/blog?category=${c.slug}`}
                aria-current={query.category === c.slug ? "page" : undefined}
                className={
                  "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors " +
                  (query.category === c.slug
                    ? "border-primary/40 bg-primary/10 font-medium text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground")
                }
              >
                {c.name}
                <span className="ml-1 tabular-nums opacity-60">
                  {countFor(c.slug)}
                </span>
              </Link>
            ))}
        </nav>
      </div>

      {(query.tag || activeCategory) && (
        <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            {query.tag ? `Tagged “${query.tag}”` : activeCategory?.description}
          </span>
          <span aria-hidden>·</span>
          <span>{filtered.length} articles</span>
          <Link
            href={clearHref}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <X aria-hidden className="size-3.5" /> Clear
          </Link>
        </p>
      )}

      {filtered.length === 0 ? (
        <section className="py-20 text-center">
          <h2 className="text-lg font-semibold tracking-tight">
            {posts.length ? "No matching articles" : "Nothing published yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {posts.length
              ? "Try a different search or browse all posts."
              : "New pieces are in progress. Subscribe to the RSS feed to follow along."}
          </p>
          {posts.length > 0 && (
            <Link
              href={clearHref}
              className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
            >
              Browse all posts
            </Link>
          )}
        </section>
      ) : (
        <>
          {featured && (
            <div className="pt-10">
              <FeaturedPost post={featured.meta} />
            </div>
          )}
          <ol>
            {listed.map(({ meta: p }) => (
              <PostRow key={p.slug} post={p} />
            ))}
          </ol>
        </>
      )}

      {pages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-10 flex items-center justify-center gap-6 border-t border-border pt-8 text-sm"
        >
          {page > 1 ? (
            <Link
              rel="prev"
              href={pageUrl(page - 1)}
              className="text-primary hover:underline"
            >
              ← Newer
            </Link>
          ) : (
            <span className="text-muted-foreground/40">← Newer</span>
          )}
          <span className="text-muted-foreground">
            Page <span className="tabular-nums text-foreground">{page}</span> of{" "}
            <span className="tabular-nums">{pages}</span>
          </span>
          {page < pages ? (
            <Link
              rel="next"
              href={pageUrl(page + 1)}
              className="text-primary hover:underline"
            >
              Older →
            </Link>
          ) : (
            <span className="text-muted-foreground/40">Older →</span>
          )}
        </nav>
      )}
    </main>
  );
}
