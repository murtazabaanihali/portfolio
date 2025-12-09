import { sql } from "drizzle-orm/sql";

import db from "@/lib/db";
import { projects, type ProjectTag } from "@/lib/db/schema";

export async function getProjectsDB(
    pageNumber: number = 1,
    tag?: ProjectTag,
    limit: number = 12
) {
    return db.query.projects.findMany({
        where: () =>
            tag ? sql`${tag} = ANY(${projects.projectTags})` : undefined,
        orderBy: (f, { asc }) => asc(f.order),
        limit: limit,
        offset: (pageNumber - 1) * limit,
    });
};

export type Project = Awaited<ReturnType<typeof getProjectsDB>>[number];

export async function getProjectBySlugDB(slug: string) {
    return db.query.projects.findFirst({
        where: (f, { eq }) => eq(f.slug, slug),
        columns: {
            projectTags: false,
            createdAt: false
        }
    });
};