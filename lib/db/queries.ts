import { sql, eq, and, desc, count, ilike, type SQL } from "drizzle-orm";

import db from "@/lib/db";
import {
    projects,
    blogPosts,
    type ProjectTag,
    type BlogPost,
    type BlogPostCategory,
} from "@/lib/db/schema";
import { withRedisCache } from "@/lib/cache";
import { BLOG_PAGE_SIZE } from "@/lib/constants";
import type { Post } from "@/lib/blog/contract";

const DB_CACHE_TTL = 7 * 24 * 3600; // 7 days (high TTL)

export function blogPostToPost(post: BlogPost): Post {
    return {
        version: 1,
        slug: post.slug,
        title: post.title,
        description: post.description,
        author: post.author,
        status: post.status as "published" | "draft",
        category: post.category,
        tags: post.tags,
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
        updatedAt: post.updatedAt ? post.updatedAt.toISOString() : null,
        cover: {
            src: post.coverSrc,
            alt: post.coverAlt,
        },
    };
}

export async function getProjectsDB(
    pageNumber: number = 1,
    tag?: ProjectTag,
    limit: number = 12
) {
    const page = Math.max(1, pageNumber);
    const cacheKey = `cache:db:projects:${page}:${tag || "all"}:${limit}`;

    return withRedisCache(cacheKey, DB_CACHE_TTL, async () => {
        return db.query.projects.findMany({
            where: () =>
                tag ? sql`${tag}::project_tag = ANY(${projects.projectTags})` : undefined,
            orderBy: (f, { asc }) => asc(f.order),
            limit: limit,
            offset: (page - 1) * limit,
        });
    });
}

export type Project = Awaited<ReturnType<typeof getProjectsDB>>[number];

export async function getProjectBySlugDB(slug: string) {
    const cacheKey = `cache:db:project:${slug}`;

    return withRedisCache(cacheKey, DB_CACHE_TTL, async () => {
        return db.query.projects.findFirst({
            where: (f, { eq }) => eq(f.slug, slug),
            columns: {
                projectTags: false,
                createdAt: false,
            },
        });
    });
}

export type BlogQueryParamsDB = {
    page?: number;
    limit?: number;
    category?: string;
    tag?: string;
    search?: string;
};

export async function getBlogPostsDB(params: BlogQueryParamsDB = {}) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, params.limit || BLOG_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(blogPosts.status, "published")];

    if (params.category && params.category !== "all") {
        conditions.push(eq(blogPosts.category, params.category as BlogPostCategory));
    }

    if (params.tag && params.tag !== "all") {
        conditions.push(sql`${params.tag} = ANY(${blogPosts.tags})`);
    }

    if (params.search && params.search.trim()) {
        conditions.push(ilike(blogPosts.title, `%${params.search.trim()}%`));
    }

    const whereClause = and(...conditions);

    const [rows, countRows] = await Promise.all([
        db.query.blogPosts.findMany({
            where: whereClause,
            orderBy: [desc(blogPosts.publishedAt)],
            limit,
            offset,
        }),
        db.select({ value: count() }).from(blogPosts).where(whereClause),
    ]);

    const total = Number(countRows[0]?.value || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasMore = page < totalPages;

    return {
        posts: rows.map(blogPostToPost),
        total,
        page,
        limit,
        totalPages,
        hasMore,
    };
}

export async function getBlogCategoriesCountDB(): Promise<Record<string, number>> {
    const rows = await db
        .select({
            category: blogPosts.category,
            count: count(),
        })
        .from(blogPosts)
        .where(eq(blogPosts.status, "published"))
        .groupBy(blogPosts.category);

    const counts: Record<string, number> = {};
    for (const row of rows) {
        counts[row.category] = Number(row.count);
    }
    return counts;
}

export async function getBlogPostBySlugDB(slug: string) {
    const post = await db.query.blogPosts.findFirst({
        where: and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")),
    });
    if (!post) return null;
    return {
        ...blogPostToPost(post),
        contentKey: post.contentKey,
        revision: post.revision,
    };
}

export async function getRelatedBlogPostsDB(
    slug: string,
    category: BlogPostCategory,
    limit: number = 3
) {
    const rows = await db.query.blogPosts.findMany({
        where: and(
            eq(blogPosts.status, "published"),
            eq(blogPosts.category, category),
            sql`${blogPosts.slug} != ${slug}`
        ),
        orderBy: [desc(blogPosts.publishedAt)],
        limit,
    });
    return rows.map(blogPostToPost);
}

export async function getBlogPostsForSitemapDB() {
    return db.query.blogPosts.findMany({
        where: eq(blogPosts.status, "published"),
        columns: {
            slug: true,
            publishedAt: true,
            updatedAt: true,
        },
        orderBy: [desc(blogPosts.publishedAt)],
    });
}