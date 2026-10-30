CREATE TYPE "public"."blog_post_category" AS ENUM('engineering', 'building-products', 'founder-notes', 'ai-agents', 'developer-experience', 'cloud-performance', 'design-accessibility');--> statement-breakpoint
CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "blog_posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" varchar(320) NOT NULL,
	"author" varchar(120) NOT NULL,
	"status" "blog_post_status" DEFAULT 'draft' NOT NULL,
	"category" "blog_post_category" NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"published_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"cover_src" text NOT NULL,
	"cover_alt" varchar(300) NOT NULL,
	"content_key" text NOT NULL,
	"revision" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_posts_status_published_idx" ON "blog_posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "blog_posts_category_idx" ON "blog_posts" USING btree ("category");