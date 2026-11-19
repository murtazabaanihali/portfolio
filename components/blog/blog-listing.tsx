"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Loader2 } from "lucide-react";

import { FeaturedPost } from "@/components/blog/featured-post";
import { PostRow } from "@/components/blog/post-row";
import { categories } from "@/lib/blog/config";
import { categoryName } from "@/lib/blog/format";
import { BLOG_SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { getBlogPosts, type BlogQueryParams } from "@/actions";

type BlogPostsResult = Awaited<ReturnType<typeof getBlogPosts>>;

interface BlogListingProps {
    initialData: BlogPostsResult;
    categoriesCount: Record<string, number>;
    initialCategory?: string;
    initialTag?: string;
    initialSearch?: string;
    initialPage?: number;
}

export function BlogListing({
    initialData,
    categoriesCount,
    initialCategory,
    initialTag,
    initialSearch = "",
    initialPage = 1,
}: BlogListingProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [searchInput, setSearchInput] = useState(initialSearch);
    const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
    const [category, setCategory] = useState<string | undefined>(initialCategory);
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
                updateUrl(
                    params.page || 1,
                    params.category,
                    params.tag,
                    params.search
                );

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
        if (newPage < 1 || newPage > data.totalPages || newPage === page) return;
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

    const activeCategoryObj = categories.find((c) => (c.slug as string) === category);
    const hasActiveFilters = Boolean(category || tag || debouncedSearch);

    // Featured post only shown on page 1 with no filters active
    const featured =
        !hasActiveFilters && page === 1 && data.posts.length > 0
            ? data.posts[0]
            : undefined;

    const listedPosts = featured ? data.posts.slice(1) : data.posts;

    return (
        <div ref={containerRef}>
            <div className="flex flex-col gap-3 border-y border-border py-4">
                <div className="relative w-full sm:max-w-xs">
                    <Search
                        aria-hidden
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        maxLength={200}
                        placeholder="Search articles…"
                        aria-label="Search posts"
                        className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    />
                    {searchInput && (
                        <button
                            type="button"
                            onClick={() => setSearchInput("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label="Clear search"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>

                <nav
                    aria-label="Blog categories"
                    className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]"
                >
                    <button
                        type="button"
                        onClick={() => handleCategoryClick(undefined)}
                        aria-current={!category && !tag ? "page" : undefined}
                        className={
                            "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors " +
                            (!category && !tag
                                ? "border-primary/40 bg-primary/10 font-medium text-primary"
                                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground")
                        }
                    >
                        All
                    </button>
                    {categories
                        .filter((c) => (categoriesCount[c.slug] || 0) > 0)
                        .map((c) => {
                            const count = categoriesCount[c.slug] || 0;
                            const isSelected = category === c.slug;
                            return (
                                <button
                                    key={c.slug}
                                    type="button"
                                    onClick={() => handleCategoryClick(c.slug)}
                                    aria-current={isSelected ? "page" : undefined}
                                    className={
                                        "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors " +
                                        (isSelected
                                            ? "border-primary/40 bg-primary/10 font-medium text-primary"
                                            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground")
                                    }
                                >
                                    {c.name}
                                    <span className="ml-1 tabular-nums opacity-60">
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                </nav>
            </div>

            {hasActiveFilters && (
                <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {tag && <span>Tagged “{tag}”</span>}
                    {category && (
                        <span>
                            {activeCategoryObj?.description || categoryName(category)}
                        </span>
                    )}
                    {debouncedSearch && <span>Search: “{debouncedSearch}”</span>}
                    <span aria-hidden>·</span>
                    <span>{data.total} articles</span>
                    {isPending && <Loader2 className="size-3.5 animate-spin text-primary" />}
                    <button
                        type="button"
                        onClick={handleClearAll}
                        className="inline-flex items-center gap-1 text-primary hover:underline ml-1"
                    >
                        <X aria-hidden className="size-3.5" /> Clear
                    </button>
                </div>
            )}

            <div
                className={`transition-opacity duration-200 ${
                    isPending ? "opacity-60 pointer-events-none" : "opacity-100"
                }`}
            >
                {data.posts.length === 0 ? (
                    <section className="py-20 text-center">
                        <h2 className="text-lg font-semibold tracking-tight">
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
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
                            >
                                Browse all posts
                            </button>
                        )}
                    </section>
                ) : (
                    <>
                        {featured && (
                            <div className="pt-10">
                                <FeaturedPost post={featured} />
                            </div>
                        )}
                        <ol>
                            {listedPosts.map((post) => (
                                <PostRow key={post.slug} post={post} />
                            ))}
                        </ol>
                    </>
                )}

                {data.totalPages > 1 && (
                    <nav
                        aria-label="Pagination"
                        className="mt-10 flex items-center justify-center gap-6 border-t border-border pt-8 text-sm"
                    >
                        {page > 1 ? (
                            <button
                                type="button"
                                onClick={() => handlePageChange(page - 1)}
                                className="text-primary hover:underline"
                            >
                                ← Newer
                            </button>
                        ) : (
                            <span className="text-muted-foreground/40 select-none">
                                ← Newer
                            </span>
                        )}
                        <span className="text-muted-foreground">
                            Page{" "}
                            <span className="tabular-nums text-foreground">
                                {page}
                            </span>{" "}
                            of{" "}
                            <span className="tabular-nums">
                                {data.totalPages}
                            </span>
                        </span>
                        {page < data.totalPages ? (
                            <button
                                type="button"
                                onClick={() => handlePageChange(page + 1)}
                                className="text-primary hover:underline"
                            >
                                Older →
                            </button>
                        ) : (
                            <span className="text-muted-foreground/40 select-none">
                                Older →
                            </span>
                        )}
                    </nav>
                )}
            </div>
        </div>
    );
}
