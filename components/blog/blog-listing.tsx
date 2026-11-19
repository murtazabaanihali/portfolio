"use client";

import { useEffect, useTransition, useRef, useCallback, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { FeaturedPost } from "@/components/blog/featured-post";
import { PostRow } from "@/components/blog/post-row";
import { categories } from "@/lib/blog/config";
import { BLOG_SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { getBlogPosts, type BlogQueryParams } from "@/actions";

type BlogPostsResult = Awaited<ReturnType<typeof getBlogPosts>>;

interface BlogListingProps {
  initialData: BlogPostsResult;
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
  initialData,
  initialCategory,
  initialTag,
  initialSearch = "",
  initialPage = 1,
}: BlogListingProps) {
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [category, setCategory] = useState<string | undefined>(
    initialCategory
  );
  const [tag, setTag] = useState<string | undefined>(initialTag);
  const [page, setPage] = useState<number>(initialPage);
  const [data, setData] = useState<BlogPostsResult>(initialData);

  const isFirstRender = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, BLOG_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput]);

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

  // Execute server action fetch when filters or search change
  const executeFetch = useCallback(
    (params: BlogQueryParams, shouldScroll = false) => {
      startTransition(async () => {
        const result = await getBlogPosts(params);
        setData(result);
        updateUrl(params.page || 1, params.category, params.tag, params.search);

        if (shouldScroll && containerRef.current) {
          containerRef.current.scrollIntoView({ behavior: "smooth" });
        }
      });
    },
    [updateUrl]
  );

  // Trigger fetch on debounced search, category, or tag change (resets to page 1)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setPage(1);
    executeFetch({
      page: 1,
      category,
      tag,
      search: debouncedSearch,
    });
  }, [debouncedSearch, category, tag, executeFetch]);

  // Handle pagination page click
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (newPage > page && !data.hasMore) || newPage === page)
      return;
    setPage(newPage);
    executeFetch(
      {
        page: newPage,
        category,
        tag,
        search: debouncedSearch,
      },
      true
    );
  };

  // Category click handler
  const handleCategoryClick = (catSlug?: string) => {
    setCategory(catSlug === category ? undefined : catSlug);
  };

  // Clear all filters handler
  const handleClearAll = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setCategory(undefined);
    setTag(undefined);
    setPage(1);
    executeFetch({
      page: 1,
      category: undefined,
      tag: undefined,
      search: "",
    });
  };

  const hasActiveFilters = Boolean(category || tag || debouncedSearch);

  // Featured post only shown on page 1 with no filters active
  const featured =
    !hasActiveFilters && page === 1 && data.posts.length > 0
      ? data.posts[0]
      : undefined;

  const listedPosts = featured ? data.posts.slice(1) : data.posts;
  const showPagination = page > 1 || data.hasMore;

  // Sidebar category filters: all categories with post counts from the current
  // result set; "All" gets the total count of posts on this query.
  const categoryFilters: CategoryFilter[] = [
    { slug: "all", name: "All", count: data.posts.length },
    ...categories.map((c) => {
      const count = data.posts.filter((p) => p.category === c.slug).length;
      return { slug: c.slug, name: c.name, count };
    }),
  ];

  const activeCategoryName =
    category === "all" || !category
      ? "All articles"
      : categoryFilters.find((c) => c.slug === category)?.name ?? "Articles";

  return (
    <div ref={containerRef}>
      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sidebar: search + categories (stacks on top on mobile) */}
        <aside className="w-full">
          <Card className="p-3 lg:sticky lg:top-28">
            <div className="relative">
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
                className="h-9 pl-9 text-sm"
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
              className="mt-3 flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0 [scrollbar-width:none]"
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
                      "flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors lg:shrink " +
                      (isActive
                        ? "bg-secondary font-medium text-secondary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")
                    }
                  >
                    <span className="truncate">{c.name}</span>
                    {c.count > 0 && (
                      <span className="tabular-nums text-muted-foreground/70">
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
          {(hasActiveFilters || isPending) && (
            <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {tag && <span>Tagged “{tag}”</span>}
              {category && <span>{activeCategoryName}</span>}
              {debouncedSearch && <span>Search: “{debouncedSearch}”</span>}
              {isPending && (
                <Loader2 className="size-3.5 animate-spin text-primary" />
              )}
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-7 gap-1 px-2 text-muted-foreground"
                >
                  <X aria-hidden className="size-3.5" /> Clear
                </Button>
              )}
            </div>
          )}

          <div
            className={`transition-opacity duration-200 ${
              isPending ? "opacity-60 pointer-events-none" : "opacity-100"
            }`}
          >
            {data.posts.length === 0 ? (
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
                className="mt-10 flex items-center justify-center gap-6 border-t border-border pt-8 text-sm"
              >
                {page > 1 ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                  >
                    ← Newer
                  </Button>
                ) : (
                  <span className="text-muted-foreground/40 select-none">
                    ← Newer
                  </span>
                )}
                <span className="text-muted-foreground">
                  Page{" "}
                  <span className="tabular-nums text-foreground">{page}</span>
                </span>
                {data.hasMore ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
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
  posts: Awaited<ReturnType<typeof getBlogPosts>>["posts"];
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
        <section key={label} aria-label={label} className="mt-10">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium text-muted-foreground">
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
