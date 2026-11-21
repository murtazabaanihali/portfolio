"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PostListSkeleton } from "./post-list-skeleton";
import { FeaturedPost } from "@/components/blog/featured-post";
import { PostRow } from "@/components/blog/post-row";
import { categories } from "@/lib/blog/config";
import { BLOG_SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { useBlogPosts, type BlogPostsResult } from "@/swr/blog";

interface BlogListingProps {
  initialCategory?: string;
  initialTag?: string;
  initialSearch?: string;
  initialPage?: number;
}

interface CategoryFilter {
  slug: string;
  name: string;
  count: number;
}

export function BlogListing({
  initialCategory,
  initialTag,
  initialSearch = "",
  initialPage = 1,
}: BlogListingProps) {
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [category, setCategory] = useState<string | undefined>(
    initialCategory
  );
  const [tag, setTag] = useState<string | undefined>(initialTag);
  const [page, setPage] = useState<number>(initialPage);
  const { data, error, isLoading: isPending } = useBlogPosts({ page, category, tag, search: debouncedSearch });

  const scrollAfterFetch = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim() !== debouncedSearch) {
        setPage(1);
        setDebouncedSearch(searchInput.trim());
      }
    }, BLOG_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput, debouncedSearch]);

  // Update URL query string without full page reloads
  const updateUrl = useCallback(
    (newPage: number, newCategory?: string, newTag?: string, newSearch?: string) => {
      const params = new URLSearchParams();
      if (newSearch) params.set("q", newSearch);
      if (newCategory) params.set("category", newCategory);
      if (newTag) params.set("tag", newTag);
      if (newPage > 1) params.set("page", String(newPage));

      const qs = params.toString();
      const newHref = qs ? `/blog?${qs}` : "/blog";
      window.history.replaceState(null, "", newHref);
    },
    []
  );

  useEffect(() => {
    updateUrl(page, category, tag, debouncedSearch);
    if (!isPending && scrollAfterFetch.current) {
      containerRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      scrollAfterFetch.current = false;
    }
  }, [page, category, tag, debouncedSearch, updateUrl, isPending]);

  const handlePageChange = (newPage: number) => {
    scrollAfterFetch.current = true;
    setPage(newPage);
  };

  // Category click handler
  const handleCategoryClick = (catSlug?: string) => {
    setPage(1);
    setCategory(catSlug === category ? undefined : catSlug);
  };

  // Clear all filters handler
  const handleClearAll = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setCategory(undefined);
    setTag(undefined);
    setPage(1);
  };

  if (error) throw error;
  const posts = data?.posts ?? [];

  const hasActiveFilters = Boolean(category || tag || debouncedSearch);

  // Featured post only shown on page 1 with no filters active
  const featured =
    !hasActiveFilters && page === 1 && posts.length > 0
      ? posts[0]
      : undefined;

  const listedPosts = featured ? posts.slice(1) : posts;
  const showPagination = page > 1 || data?.hasMore;

  // Sidebar category filters: all categories with post counts from the current
  // result set; "All" gets the total count of posts on this query.
  const categoryFilters: CategoryFilter[] = [
    { slug: "all", name: "All", count: posts.length },
    ...categories.map((c) => {
      const count = posts.filter((p) => p.category === c.slug).length;
      return { slug: c.slug, name: c.name, count };
    }),
  ];

  const activeCategoryName =
    category === "all" || !category
      ? "All articles"
      : categoryFilters.find((c) => c.slug === category)?.name ?? "Articles";

  return (
    <div ref={containerRef}>
      <div className="grid gap-6 sm:gap-8 md:gap-10 md:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sidebar: search + categories (stacks on top on mobile) */}
        <aside className="w-full min-w-0">
          <Card className="min-w-0 p-3 md:sticky md:top-28">
            <div className="relative mb-2">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                maxLength={200}
                placeholder="Search articles…"
                aria-label="Search posts"
                className="h-9 pl-9 text-base sm:text-sm"
              />
              {searchInput && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchInput("")}
                  className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>

            <nav
              aria-label="Blog categories"
              className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 pt-0.5 touch-pan-x md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0 md:pb-0 md:pt-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {categoryFilters.map((c) => {
                const isActive = !tag && (category ?? "all") === c.slug;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => handleCategoryClick(c.slug === "all" ? undefined : c.slug)}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      "flex shrink-0 items-center justify-between gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors md:w-full md:shrink md:gap-2 md:rounded-md md:px-3 md:py-2 md:text-sm " +
                      (isActive
                        ? "bg-secondary font-medium text-secondary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")
                    }
                  >
                    <span className="truncate">{c.name}</span>
                    {!isPending && c.count > 0 && (
                      <span className="tabular-nums text-[11px] text-muted-foreground/70 md:text-xs">
                        {c.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </Card>
        </aside>

        {/* Main column: featured + posts */}
        <div className="min-w-0">
          {(hasActiveFilters || (isPending && data)) && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:mb-6 sm:text-sm">
              {tag && <span>Tagged “{tag}”</span>}
              {category && <span>{activeCategoryName}</span>}
              {debouncedSearch && <span>Search: “{debouncedSearch}”</span>}
              {data && isPending && (
                <span role="status" className="inline-flex items-center gap-1.5">
                  <Loader2 aria-hidden="true" className="size-3.5 motion-safe:animate-spin text-primary" /> Updating articles…
                </span>
              )}
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-6 gap-1 px-2 text-xs text-muted-foreground sm:h-7"
                >
                  <X aria-hidden className="size-3" /> Clear
                </Button>
              )}
            </div>
          )}

          <div
            aria-busy={isPending}
            className={`transition-opacity duration-200 ${
              isPending && data?.posts.length ? "opacity-75" : "opacity-100"
            }`}
          >
            {!data || (!posts.length && isPending) ? (
              <PostListSkeleton featured={!hasActiveFilters && page === 1} />
            ) : !posts.length ? (
              <section className="py-20 text-center">
                <h2 className="font-serif text-lg font-semibold tracking-tight">
                  {hasActiveFilters
                    ? "No matching articles"
                    : "Nothing published yet"}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? "Try a different search or clear your filters."
                    : "New pieces are in progress. Subscribe to the RSS feed to follow along."}
                </p>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleClearAll}
                    className="mt-4"
                  >
                    Browse all posts
                  </Button>
                )}
              </section>
            ) : (
              <>
                {featured && <FeaturedPost post={featured} />}

                <PostList posts={listedPosts} />
              </>
            )}

            {showPagination && (
              <nav
                aria-label="Pagination"
                className="mt-8 flex items-center justify-center gap-4 border-t border-border pt-6 text-sm sm:mt-10 sm:gap-6 sm:pt-8"
              >
                {page > 1 ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    ← Newer
                  </Button>
                ) : (
                  <span className="text-muted-foreground/40 select-none">
                    ← Newer
                  </span>
                )}
                <span className="text-xs text-muted-foreground sm:text-sm">
                  Page{" "}
                  <span className="tabular-nums text-foreground">{page}</span>
                </span>
                {data?.hasMore ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    Older →
                  </Button>
                ) : (
                  <span className="text-muted-foreground/40 select-none">
                    Older →
                  </span>
                )}
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Group posts under month headings and render rows. */
function PostList({
  posts,
}: {
  posts: BlogPostsResult["posts"];
}) {
  if (posts.length === 0) return null;

  const groups = new Map<string, typeof posts>();
  for (const post of posts) {
    const key = monthLabel(post.publishedAt);
    const group = groups.get(key);
    if (group) group.push(post);
    else groups.set(key, [post]);
  }

  return (
    <>
      {[...groups.entries()].map(([label, groupPosts]) => (
        <section key={label} aria-label={label} className="mt-8 sm:mt-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <h2 className="text-xs sm:text-sm font-medium text-muted-foreground">
              {label}
            </h2>
            <Separator className="flex-1" />
          </div>
          <ol>
            {groupPosts.map((post) => (
              <PostRow key={post.slug} post={post} />
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}

function monthLabel(iso: string | null): string {
  if (!iso) return "Undated";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Undated";
  return d.toLocaleDateString("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
