CREATE TYPE "public"."project_tag" AS ENUM('web', 'mobile', 'desktop', 'ios', 'ai', 'saas', 'other');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"project_tags" "project_tag"[] DEFAULT '{}' NOT NULL,
	"title" text NOT NULL,
	"short_description" text NOT NULL,
	"order" serial NOT NULL,
	"images" varchar(2555)[] DEFAULT '{}' NOT NULL,
	"description" text NOT NULL,
	"tech_stack" varchar(2555)[] DEFAULT '{}' NOT NULL,
	"live_url" text,
	"github_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
