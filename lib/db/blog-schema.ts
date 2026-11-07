/**
 * Drizzle query mirror for blog metadata.
 *
 * Coverage/related-article lookup in tools/blog/catalog.ts reads this table.
 * Content serving and publishing remain R2-backed; the publisher does NOT
 * automatically synchronize this mirror. Rows must be populated and kept current
 * for complete coverage results and valid published link suggestions.
 *
 * No migration/schema generation is performed by lookup. Before provisioning,
 * include this schema in the project's Drizzle migration configuration and use
 * the normal migration flow with explicit operator authorization. Missing tables
 * are reported as DB lookup failures, never silently replaced by R2 searches.
 */
import {
    pgTable,
    text,
    timestamp,
    varchar,
    pgEnum,
    integer,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";

export const blogPostStatus = pgEnum("blog_post_status", ["draft", "published"]);
export const blogPostCategory = pgEnum("blog_post_category", [
    "engineering",
    "building-products",
    "founder-notes",
    "ai-agents",
    "developer-experience",
    "cloud-performance",
    "design-accessibility",
]);

export type BlogPostStatus = (typeof blogPostStatus.enumValues)[number];
export type BlogPostCategory = (typeof blogPostCategory.enumValues)[number];

export const blogPosts = pgTable(
    "blog_posts",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        /** Stable public slug; must never change after publication. */
        slug: text("slug").notNull(),
        title: varchar("title", { length: 160 }).notNull(),
        description: varchar("description", { length: 320 }).notNull(),
        author: varchar("author", { length: 120 }).notNull(),
        status: blogPostStatus("status").notNull().default("draft"),
        category: blogPostCategory("category").notNull(),
        /** Normalized lowercase-hyphenated tags (matches the manifest contract). */
        tags: text("tags").array().notNull().default([]),
        /** Original publication instant; preserved across edits. */
        publishedAt: timestamp("published_at", { withTimezone: true }),
        /** Last editorial correction; never advanced by reads/builds. */
        updatedAt: timestamp("updated_at", { withTimezone: true }),
        /** R2 object key or public CDN URL of the cover; alt kept alongside. */
        coverSrc: text("cover_src").notNull(),
        coverAlt: varchar("cover_alt", { length: 300 }).notNull(),
        /** R2 key of the currently active article object (for owner queries). */
        contentKey: text("content_key").notNull(),
        /** sha256 of the exact published Markdown revision. */
        revision: varchar("revision", { length: 64 }).notNull(),
    },
    (table) => [
        uniqueIndex("blog_posts_slug_key").on(table.slug),
        index("blog_posts_status_published_idx").on(table.status, table.publishedAt),
        index("blog_posts_category_idx").on(table.category),
    ],
);

export type NewBlogPost = typeof blogPosts.$inferInsert;
export type BlogPost = typeof blogPosts.$inferSelect;
