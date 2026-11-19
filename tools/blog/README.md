# Portfolio Blog Tool

A lightweight, clean CLI tool for publishing Markdown blog posts to Cloudflare R2 with automatic CDN URL rewriting and Neon PostgreSQL metadata synchronization.

Designed specifically for AI and automated agents: zero TUI dependencies, zero runtime AI bloat, single-command publishing, and a human-readable R2 folder structure.

---

## R2 Storage Structure

All published posts and assets live in a clean, self-contained hierarchy in Cloudflare R2:

```text
blog/
├── manifest.json              # Public manifest of all active published posts
└── posts/
    ├── scaling-sqlite/
    │   ├── post.md            # Finalized Markdown post with YAML frontmatter
    │   ├── cover.png          # Editorial cover illustration
    │   └── images/            # Inline images referenced in the article
    │       └── benchmark.png
    └── modern-api-design/
        ├── post.md
        └── cover.webp
```

- **`blog/manifest.json`**: Single JSON document listing all published posts, their metadata, content keys, and asset references. Kept fresh with `Cache-Control: no-store`.
- **`blog/posts/<slug>/`**: Everything related to the post is colocated in one human-readable directory. Covers and inline images are served via the public R2 media CDN (`NEXT_PUBLIC_MEDIA_CDN_DOMAIN`) with `Cache-Control: public, max-age=300`.

---

## CLI Usage

### Publish Posts (Single or Bulk)

```bash
# 1. Publish single post
bun run blog publish ./my-article/post.md --cover ./my-article/cover.png
bun run blog publish ./my-article/post.md (uses frontmatter cover.src)

# 2. Bulk publish multiple posts by path
bun run blog publish ./post1.md ./post2.md ./post3.md

# 3. Bulk publish an entire folder of articles
bun run blog publish ./my-articles/

# 4. Bulk publish from a JSON batch file
bun run blog publish --batch ./batch.json
# batch.json format: ["./p1/post.md", "./p2/post.md"]
# or: [{ "file": "./p1/post.md", "cover": "./p1/cover.png" }]
```

When publishing in bulk:
- All posts are validated first.
- The publishing lock is acquired **once** for the entire batch.
- Assets are uploaded in parallel and `blog/manifest.json` is updated atomically.
- Returns a comprehensive result breakdown (`{ total, published, failed, results }`).

The tool:
1. Validates strict GFM Markdown and YAML frontmatter.
2. Checks raster image format signatures (PNG, WebP, JPEG).
3. Resolves and uploads the cover image to `blog/posts/<slug>/cover.<ext>`.
4. Uploads inline `./images/` and rewrites Markdown references to CDN URLs.
5. Uploads the finalized post to `blog/posts/<slug>/post.md`.
6. Atomically updates `blog/manifest.json` under an absent-only lock (`blog/publishing.lock`).
7. Updates the PostgreSQL database mirror (`blog_posts` table) if `DATABASE_URL` is configured.

### List Published Posts

```bash
bun run blog list
```

Outputs JSON list of all active posts in `blog/manifest.json`: title, slug, category, published date, cover URL, and canonical link.

### Unpublish a Post

```bash
bun run blog unpublish my-post-slug --yes
```

Removes the post from `blog/manifest.json` and marks it as draft in PostgreSQL. Files in R2 remain intact.

### Permanently Delete a Post

```bash
bun run blog delete my-post-slug --yes
```

Removes the post from `blog/manifest.json`, deletes all objects under `blog/posts/<slug>/` from R2, and deletes the row from PostgreSQL.

### Migrate Legacy Posts

```bash
# Preview what would be migrated
bun run blog migrate --dry-run

# Execute migration from legacy blog/objects/ to blog/posts/<slug>/
bun run blog migrate --yes
```

Copies legacy posts and covers to the new `blog/posts/<slug>/` layout, writes `blog/manifest.json`, and updates PostgreSQL rows.

### Lock Management & Recovery

```bash
# Check if a lock is currently held
bun run blog lock-status

# Force-release a stranded lock
bun run blog unlock --yes --force
```

---

## Environment Setup

Ensure the following environment variables are set in your `.env` (loaded automatically by Bun):

```bash
# Cloudflare R2 (S3-compatible API for publishing tool)
CLOUDFLARE_R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
CLOUDFLARE_R2_BUCKET="portfolio-blog"
CLOUDFLARE_R2_ACCESS_KEY_ID="..."
CLOUDFLARE_R2_SECRET_ACCESS_KEY="..."

# Media CDN & App URLs
NEXT_PUBLIC_MEDIA_CDN_DOMAIN="https://content.example.com"
NEXT_PUBLIC_APP_URL="https://example.com"

# Optional Database Mirror
DATABASE_URL="postgresql://..."
```

---

## Testing

```bash
# Run unit and integration tests
bun run blog:test

# Run typechecking
bun run blog:typecheck
```
