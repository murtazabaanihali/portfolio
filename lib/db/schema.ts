import {
    pgTable,
    text,
    timestamp,
    varchar,
    pgEnum,
    serial,
} from "drizzle-orm/pg-core";

export const projectTag = pgEnum("project_tag", [
    "web",
    "mobile",
    "desktop",
    "ios",
    "ai",
    "saas",
    "other",
]);

export type ProjectTag = (typeof projectTag.enumValues)[number];

export const projects = pgTable("projects", {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    projectTags: projectTag("project_tags").array().default([]).notNull(),

    title: varchar("title", { length: 255 }).notNull(),
    shortDescription: text("short_description").notNull(),
    order: serial("order").notNull(),

    mainImage: varchar("main_image", { length: 2555 }).notNull(),
    description: text("description").notNull(),
    images: varchar("images", { length: 2555 }).array().notNull().default([]),

    techStack: varchar("tech_stack", { length: 2555 })
        .array()
        .notNull()
        .default([]),
    liveUrl: varchar("live_url", { length: 255 }),
    githubUrl: varchar("github_url", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export type NewProject = typeof projects.$inferInsert;
