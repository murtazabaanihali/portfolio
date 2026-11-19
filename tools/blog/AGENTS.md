# Blog Authoring & Publishing Guide for Agents

This guide instructs AI and automated agents on authoring, formatting, illustrating, and publishing blog posts for Murtaza Baanihali's portfolio blog.

---

## 1. Fast Track: Publish in One Command

To publish an article, author your Markdown file (and cover image), then run:

```bash
bun run blog publish ./path/to/post.md --cover ./path/to/cover.png
```

If the Markdown frontmatter references a local cover image (e.g. `cover: { src: "./cover.png" }`), you can omit `--cover`:

```bash
bun run blog publish ./path/to/post.md
```

The publishing tool automatically:
1. Validates strict GFM Markdown and YAML frontmatter.
2. Validates image formats and magic bytes (PNG, WebP, JPEG).
3. Automatically compresses cover and inline images using sharp before uploading to R2 (resizes to max width 1000px, quality 70, converted to WebP for optimal performance).
4. Assigns `publishedAt` and `updatedAt` timestamps if missing.
5. Uploads cover and any inline `./images/` to Cloudflare R2 under `blog/posts/<slug>/`.
6. Rewrites relative inline image URLs to CDN URLs in the published post.
7. Atomically updates `blog/manifest.json` in R2.
8. Synchronizes the PostgreSQL database mirror (`blog_posts` table) if `DATABASE_URL` is configured.

### CLI Reference

All commands return clean JSON to stdout:

```bash
# Publish or update a single post (images are automatically compressed to WebP before upload)
bun run blog publish ./my-post/post.md [--cover ./my-post/cover.png]

# Bulk publish multiple posts at once
bun run blog publish ./post1.md ./post2.md ./post3.md

# Optional: compress images offline / standalone before authoring:
bun run blog compress ./image.jpg
bun run blog compress ./my-article/

# Bulk publish an entire directory of posts
bun run blog publish ./my-articles/

# Bulk publish from a batch JSON file
bun run blog publish --batch ./batch.json

# List all published posts
bun run blog list

# Unpublish a post (removes from public manifest while keeping files in R2)
bun run blog unpublish my-post-slug --yes

# Permanently delete a post, its files in R2, and its DB record
bun run blog delete my-post-slug --yes

# Migrate legacy R2 blog/objects/ layout to blog/posts/<slug>/
bun run blog migrate --yes
```

---

## 2. Article File Structure & Conventions

Keep each article self-contained in its own directory:

```text
my-article/
├── post.md
├── cover.png (or cover.webp / cover.jpg)
└── images/
    ├── architecture.png
    └── benchmarks.png
```

### Frontmatter Schema

Posts require strict YAML frontmatter without raw HTML or MDX:

```yaml
---
version: 1
title: "Designing a Clean, Reliable Publishing Pipeline"
slug: clean-reliable-publishing-pipeline
description: "A clear, substantive summary of the article (30–320 characters)."
author: Murtaza Baanihali
status: published
category: engineering
tags:
  - architecture
  - developer-experience
publishedAt: null
updatedAt: null
cover:
  src: "./cover.png"
  alt: "Minimalist technical ink drawing of modular architecture on warm textured paper"
---
```

- **`version`**: Always `1`.
- **`title`**: 5–160 characters. Concrete, specific, and informative.
- **`slug`**: Lowercase alphanumeric with hyphens (e.g. `scaling-distributed-systems`). Must be unique.
- **`description`**: 30–320 characters. Plain text summary explaining the practical value.
- **`author`**: Defaults to `"Murtaza Baanihali"`.
- **`status`**: `"published"`.
- **`category`**: Must match one of the configured categories:
  - `engineering` — Architecture, implementation details, and maintainable software.
  - `building-products` — From idea to useful product: scope, iteration, and shipping.
  - `founder-notes` — Practical notes on decisions and trade-offs as a solo founder.
  - `ai-agents` — AI models, practical uses, integrations, and agent workflows.
  - `ai-news` — Model announcements, releases, and developments.
  - `marketing-growth` — Audience building, positioning, distribution, and growth.
  - `business-ecommerce` — Online business, economics, and real-world trade-offs.
  - `technology` — Technology news, tools, trends, and impact.
  - `perspectives` — Opinions, observations, and ideas across general topics.
  - `developer-experience` — Tools, APIs, SDKs, and developer workflows.
  - `cloud-performance` — Deploying, measuring, and operating reliable cloud systems.
  - `design-accessibility` — Thoughtful interfaces and accessible web design.
- **`tags`**: 1–12 lowercase hyphenated strings.
- **`publishedAt` / `updatedAt`**: Set to `null` on new posts (assigned automatically at publish time) or retain existing ISO strings when editing.
- **`cover`**:
  - `src`: Relative path `./cover.png` (or `.jpg`, `.jpeg`, `.webp`), or an existing HTTPS / managed key.
  - `alt`: 5–300 characters. Descriptive alt text representing the visual subject.

### Inline Images

Reference local inline images using `./images/<filename>.<ext>`:

```markdown
Here is the system boundary:

![Modular system architecture](./images/architecture.png)
```

- Images must reside in a flat `./images/` directory beside `post.md`.
- Formats: PNG, WebP, or JPEG (no SVG, no symlinks, max 10MB each, max 50 images total).
- The publisher uploads them to `blog/posts/<slug>/images/<filename>` and rewrites URLs automatically.

---

## 3. Visual Direction: Cover Images & Placeholders

Every article must have an impressive, high-quality, professional cover image. Content will be provided externally by the working agent.

### ⛔ What Is Strictly Forbidden (AI Slop & Sci-Fi Clichés)

Do **NOT** generate or accept:
- **No glowing neon / cyberpunk**: No neon blues, purples, Tron grids, floating digital particles, matrix green rain, or glowing wires.
- **No sci-fi tropes**: No robot hands touching holograms, glowing cyborg brains in glass spheres, floating VR headsets, or laser circuits.
- **No generic AI bloat**: No glossy 3D plastic spheres, floating abstract cubes, corporate stock vector people with oversized limbs, or fake UI screenshots with unreadable gibberish text.

### Approved Visual Styles (Fresh, Impressive, Professional)

Choose from one of these clean aesthetic directions:

#### 1. Minimalist Architectural & Technical Ink Drawings
Clean technical drafting or fine-liner pen sketches. Geometric clarity, subtle cross-hatching, crisp black or dark sepia ink on warm off-white or natural paper texture.
- **Prompt Formula**:
  `"Minimalist technical ink line drawing representing [concept/metaphor], fine architectural drafting linework, elegant cross-hatching, crisp monochrome ink on warm cream textured paper, restrained, high-end editorial illustration, no text, 16:9 aspect ratio."`
- **Example Concepts**:
  - Cloud infrastructure: Exploded architectural axonometric diagram of interlocking clean stone or paper blocks.
  - Email deliverability / APIs: Minimalist technical drawing of pneumatic routing tubes or precision envelope calipers.
  - Databases / indexing: Clean technical cross-section of a library card catalog mechanism or geometric sorting grid.

#### 2. Modernist Swiss / Bauhaus Graphic Poster
Clean geometric abstractions, generous negative space, asymmetric balance, and a warm, restrained earth-tone palette (e.g. slate grey, terracotta, deep navy, forest green, warm linen).
- **Prompt Formula**:
  `"Swiss style modern graphic art, minimalist geometric abstraction of [concept], matte earth tones of terracotta, slate grey, and warm cream, clean vector shapes, generous negative space, high-end editorial poster, no text, 16:9 aspect ratio."`
- **Example Concepts**:
  - Workflow automation: Overlapping clean circles and directional rhythm in terracotta and raw umber.
  - Scaling & performance: Ascending clean bars of varying widths forming an elegant harmonious sequence.

#### 3. Handcrafted Linocut & Woodblock Print
Artisanal relief printmaking. Bold organic silhouettes, hand-carved woodcut texture, tactile ink impressions on textured deckle-edge paper.
- **Prompt Formula**:
  `"Editorial linocut print illustrating [concept], hand-carved woodblock aesthetic, rich black and warm clay ink on heavy textured artisanal paper, organic handcrafted printmaking feel, no text, no AI bloat, 16:9 aspect ratio."`
- **Example Concepts**:
  - Solo founder journey: Single lighthouse or wooden workbench with precision hand tools.
  - Security / Encryption: Stylized handcrafted interlocking key and tumbler in deep black relief ink.

#### 4. Minimalist Studio Still-Life Photography
Physical object metaphors photographed in a serene, naturally lit studio. Soft directional daylight from a large window, gentle shadows, tactile materials (linen, polished stone, matte ceramic, machined aluminium, paper stationery).
- **Prompt Formula**:
  `"Editorial studio photograph of [physical objects representing concept], soft natural window daylight, subtle soft shadows, warm muted aesthetic, tactile materials of paper and brushed metal, Kinfolk and Monocle magazine aesthetic, no text, 16:9 aspect ratio."`
- **Example Concepts**:
  - Data pipelines: Sleek brass hourglass beside a folded technical notebook on a light oak desk.
  - Customer conversations: Two minimalist ceramic coffee cups and an open fountain pen on textured linen.

---

## 4. Writing Quality & Editorial Standards

- **Finished Reader-Facing Prose**: Write complete, well-reasoned articles. Avoid outlines, questionnaires, placeholders, or corporate filler.
- **Engaging Voice**: Direct, conversational, and specific. Open with the substantive news, central argument, or tension—do not start with generic "In today's fast-paced digital world" openings.
- **Accurate Claims**: Do not invent benchmarks, customer quotes, or test results. Explain principles with concrete, supported examples.
- **Clean Markdown**: Use standard GFM headings (`##`, `###`), tables, fenced code blocks, and blockquotes. Never use `<h1>` in the body (the page renders the title).
