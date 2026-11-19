import { sql } from "drizzle-orm/sql";

import db from "@/lib/db";
import { projects, type ProjectTag } from "@/lib/db/schema";
import { withRedisCache } from "@/lib/cache";

const DB_CACHE_TTL = 7 * 24 * 3600; // 7 days (high TTL)

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