"use client";

import { getBlogPosts, getRelatedBlogPosts, type BlogQueryParams } from "@/actions";
import { getArticleContent } from "@/actions/article";
import { useAppSWR } from "./index";

export type BlogPostsResult = Awaited<ReturnType<typeof getBlogPosts>>;

export function useBlogPosts(query: BlogQueryParams) {
    return useAppSWR(["blog-posts", query] as const, ([, params]) => getBlogPosts(params), {
        keepPreviousData: true,
    });
}

export function useArticle(slug: string) {
    return useAppSWR(["article", slug] as const, ([, id]) => getArticleContent(id));
}

export function useRelatedPosts(slug: string, category?: string) {
    return useAppSWR(category ? ["related-posts", slug, category] as const : null,
        ([, id, cat]) => getRelatedBlogPosts(id, cat));
}
