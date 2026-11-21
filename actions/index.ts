"use server";

import { headers } from "next/headers";

import { ProjectTag } from "@/lib/db/schema";
import { sendContactMail } from "@/lib/resend";
import {
    getProjectBySlugDB,
    getProjectsDB,
    getBlogPostsDB,
    getBlogPostBySlugDB,
    getRelatedBlogPostsDB,
    type BlogQueryParamsDB,
} from "@/lib/db/queries";
import { type BlogPostCategory } from "@/lib/db/schema";
import { checkEmailRateLimit, getClientIp } from "@/lib/ratelimit";
import { withRedisCache, isDynamicServerError } from "@/lib/cache";
import {
    BLOG_PAGE_SIZE,
    BLOG_CACHE_TTL,
    BLOG_SEARCH_CACHE_TTL,
    BLOG_CACHE_KEYS,
} from "@/lib/constants";

export const contactMe = async (form: FormData) => {
    try {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const name = form.get("name")?.toString().trim();
        const email = form.get("email")?.toString().trim();
        const subject = form.get("subject")?.toString().trim();
        const message = form.get("message")?.toString().trim();

        if (!name) return { error: "Please enter valid name." };
        if (!email || !emailRegex.test(email))
            return { error: "Please enter valid email." };
        if (!subject) return { error: "Please enter valid subject." };
        if (!message) return { error: "Please enter valid message." };

        const headerList = await headers();
        const ip = getClientIp(headerList);
        const identifier = ip !== "127.0.0.1" ? ip : `${ip}:${email}`;

        const rateLimit = await checkEmailRateLimit(`portfolio:limit:${identifier}`);
        if (!rateLimit.success) {
            return {
                error: rateLimit.error || "Too many emails sent. Please try again later.",
            };
        }

        await sendContactMail({ name, email, subject, message });
        return {
            success: "Thank you for your message. I'll get back to you soon!",
        };
    } catch (error) {
        console.log("Error contacting me", error);
        return { error: "Failed to send message. Please try again later or contact directly." };
    }
};

export const getProjects = async (pageNumber: number = 1, tag?: ProjectTag) => {
    try {
        const page = Math.max(1, pageNumber);
        const cacheKey = `cache:projects:${page}:${tag || "all"}`;
        const ttl = 7 * 24 * 3600; // 7 days (high TTL)

        return await withRedisCache(cacheKey, ttl, async () => {
            const projects = await getProjectsDB(page, tag, 12);
            return { projects, more: projects?.length >= 12 };
        });
    } catch (error) {
        if (isDynamicServerError(error)) throw error;
        console.log("Error getting projects ", error);
        throw error;
    }
};

export const getProjectBySlug = async (slug: string) => {
    try {
        const cacheKey = `cache:project:${slug}`;
        const ttl = 7 * 24 * 3600; // 7 days (high TTL)

        return await withRedisCache(cacheKey, ttl, async () => {
            return (await getProjectBySlugDB(slug)) ?? null;
        });
    } catch (error) {
        if (isDynamicServerError(error)) throw error;
        console.log("Error getting project by slug ", error);
        throw error;
    }
};

export type BlogQueryParams = BlogQueryParamsDB;

export const getBlogPosts = async (params: BlogQueryParams = {}) => {
    try {
        const page = Math.max(1, params.page || 1);
        const limit = Math.max(1, params.limit || BLOG_PAGE_SIZE);
        const category = params.category?.trim() || "all";
        const tag = params.tag?.trim() || "all";
        const search = (params.search || "").slice(0, 200).trim();

        const isSearch = search.length > 0;
        const cacheKey = isSearch
            ? BLOG_CACHE_KEYS.search(search, page, limit, category, tag)
            : BLOG_CACHE_KEYS.list(page, limit, category, tag);
        const ttl = isSearch ? BLOG_SEARCH_CACHE_TTL : BLOG_CACHE_TTL;

        return await withRedisCache(cacheKey, ttl, async () => {
            return getBlogPostsDB({
                page,
                limit,
                category: category === "all" ? undefined : category,
                tag: tag === "all" ? undefined : tag,
                search: isSearch ? search : undefined,
            });
        });
    } catch (error) {
        if (isDynamicServerError(error)) throw error;
        console.error("Error getting blog posts:", error);
        throw error;
    }
};

export const getBlogPostBySlug = async (slug: string) => {
    try {
        return await withRedisCache(
            BLOG_CACHE_KEYS.bySlug(slug),
            BLOG_CACHE_TTL,
            async () => getBlogPostBySlugDB(slug)
        );
    } catch (error) {
        if (isDynamicServerError(error)) throw error;
        console.error("Error getting blog post by slug:", error);
        return null;
    }
};

export const getRelatedBlogPosts = async (
    slug: string,
    category: string,
    limit: number = 3
) => {
    try {
        return await withRedisCache(
            BLOG_CACHE_KEYS.related(slug, category),
            BLOG_CACHE_TTL,
            async () => getRelatedBlogPostsDB(slug, category as BlogPostCategory, limit)
        );
    } catch (error) {
        if (isDynamicServerError(error)) throw error;
        console.error("Error getting related blog posts:", error);
        return [];
    }
};
