ALTER TABLE "projects" ALTER COLUMN "title" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "live_url" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "github_url" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "updated_at" DROP DEFAULT;