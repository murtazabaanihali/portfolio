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

# Update an existing published post (title, desc, .md file, cover image, category, tags, cover alt):
bun run blog update my-post-slug --title "Updated Title"
bun run blog update my-post-slug --desc "Updated description"
bun run blog update my-post-slug --file ./updated-post.md
bun run blog update my-post-slug --cover ./new-cover.png --cover-alt "Fresh illustration"
bun run blog update my-post-slug --category ai-agents --tags "agents, workflow"

# Bulk update multiple existing posts from a batch JSON file:
bun run blog update --batch ./update-batch.json
# update-batch.json format: [{ "slug": "my-post", "title": "New Title", "desc": "New description" }]

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

## 3. Visual Direction & Cover Generation Pipeline

Every article must have an impressive, high-quality, professional cover image. Content will be provided externally by the working agent.

### ⛔ What Is Strictly Forbidden (AI Slop & Sci-Fi Clichés)

Do **NOT** generate or accept:
- **No glowing neon / cyberpunk**: No neon blues, purples, Tron grids, floating digital particles, matrix green rain, or glowing wires.
- **No sci-fi tropes**: No robot hands touching holograms, glowing cyborg brains in glass spheres, floating VR headsets, or laser circuits.
- **No generic AI bloat**: No glossy 3D plastic spheres, floating abstract cubes, corporate stock vector people with oversized limbs, or fake UI screenshots with unreadable gibberish text.
- **No sterile CAD wireframes**: Avoid generic drafting compasses or mechanical diagrams without narrative context.

### Approved Editorial Visual Styles

Choose from one of these four refined aesthetic directions, inspired by elite publications (*Stripe Press*, *Monocle*, *The New Yorker*, *Bauhaus*):

#### 1. Stripe Press Risograph & Vintage Technical Manual (Architecture, Cloud, DB, Systems)
Abstract intellectual book cover; vintage technical manual meets modern indie publishing.
- **Formula**:
  `"Stripe Press book cover illustration, risograph print aesthetic, [punchy intellectual metaphor for concept], 2-color spot ink in deep cobalt blue and warm terracotta, halftone stipple shading, subtle ink misregistration, tactile speckled heavy off-white cardstock, retro-futuristic technical minimalism, strong graphic silhouette, generous negative space, no text, 16:9 aspect ratio"`
- **Example**: Interlocking modular archival filing drawers sliding open to reveal crisp vellum paper folios.

#### 2. Monocle Mid-Century Flat Editorial (Operations, Founders, SaaS, Commerce)
Sophisticated European graphic editorial; flat gouache silhouettes, architectural shadows, and tactile workspace objects.
- **Formula**:
  `"Monocle magazine editorial illustration, mid-century modern graphic art, [tangible physical objects or setting for concept], flat gouache shapes, muted earthy palette of slate grey, olive drab, warm amber, and raw linen, hard-edge architectural cast shadows, sophisticated editorial minimalism, generous negative space, no text, 16:9 aspect ratio"`
- **Example**: A craftsman's tidy workbench with specialized hand tools neatly aligned alongside blueprints.

#### 3. The New Yorker Editorial Spot Illustration (Academic, Culture, Essays, Ethics, Viva)
Cultured, observational editorial cartooning; loose dip-pen ink linework with pale sepia and watercolor washes.
- **Formula**:
  `"New Yorker editorial spot illustration, loose fluid dip-pen and ink drawing, [wry or insightful visual metaphor for concept], delicate monochrome linework with pale sepia and watercolor wash pooling, off-white textured cartridge paper, cultured literary publication art, generous negative space, no text, 16:9 aspect ratio"`
- **Example**: An olive branch resting across balanced brass legal scales atop an embossed parchment document.

#### 4. Constructivist Geometric Bauhaus Poster (Algorithms, Data, Statistics, Math)
Swiss/Bauhaus asymmetric poster design minus text; bold graphic forms in spatial tension and matte earth-tone color fields.
- **Formula**:
  `"Swiss style modern constructivist graphic art, minimalist geometric abstraction of [mathematical or systemic concept], bold asymmetric composition of intersecting matte color planes in raw sienna, deep charcoal, and warm cream linen, clean structural vector geometry, generous negative space, high-end editorial poster, no text, 16:9 aspect ratio"`
- **Example**: A branching B-tree hierarchy carving precise transit channels through a dense geometric grid.

---

### Automated Cover Generation & Cropping Pipeline

The project uses **FLUX.1 Schnell** via Pollinations.ai with the key saved in `.env` (`POLLINATIONS_API_KEY`).

#### Generation Script & Post-Processing (Sharp 16:9 Crop)

Raw generated images from FLUX are `1024x576`. To remove any corner watermarks or signatures while preserving exact 16:9 aspect ratio, crop with `sharp`:

```typescript
import sharp from "sharp";

const key = process.env.POLLINATIONS_API_KEY;

// 1. Generate 1024x576 via FLUX.1 Schnell
const res = await fetch("https://gen.pollinations.ai/v1/images/generations", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "black-forest-labs/flux.1-schnell",
    prompt: promptText,
    size: "1024x576",
  }),
});

const data = await res.json();
const rawBuf = Buffer.from(data.data[0].b64_json, "base64");

// 2. Crop to 896x504 (exact 16:9) to trim 80px right and 48px bottom (removes watermarks)
const croppedPng = await sharp(rawBuf)
  .extract({ left: 48, top: 24, width: 896, height: 504 })
  .png()
  .toBuffer();

await Bun.write("./cover.png", croppedPng);

// 3. Update blog post (CLI automatically compresses to WebP, uploads to R2, updates manifest & DB)
// bun run blog update <slug> --cover ./cover.png --cover-alt "<alt>"
```

---

## 4. Reusable Project Context

- **Build context**: For “Build context for `<project-name>` in this blog,” use the facts and links from the prompt and any supplied references. Reuse the existing slug, or create a lowercase kebab-case slug under `tools/blog/projects/`. Read any existing files first and update them in place; merge new facts rather than appending duplicates. Ask only if a missing or conflicting detail materially changes the brief. This request alone does not draft or publish a post.
- **Keep it small**: Start with [`projects/README.md`](projects/README.md). Capture what the project does and for whom, notable shipped features, relevant stack or architecture decisions, useful trade-offs or workflows, and source links. Leave out empty sections, generic pitches, and implementation inventories. Add a short topic-specific file (e.g. `architecture.md`) only when it earns its own page; link it from the project README.
- **Draft with it**: Before outlining a project-related post, read `projects/<project-slug>/README.md` and only the linked notes relevant to the angle. Use the editorial brief (`blog-context.md`, or `blog-context.example.md` if absent) for voice and product fit; maintain project-specific facts in the project folder. If sources disagree, flag the conflict and verify or omit the claim. If no project folder exists, rely on supplied or verified sources, not assumptions. Do not load unrelated project notes or force product mentions.
- **Separate evidence from ideas**: Attribute owner-supplied facts and record source links when available. Label planned features and possible article angles; do not present them as shipped or tested. Recheck time-sensitive details (pricing, integrations, availability) before publication. Store only public-safe summaries: no credentials, customer data, or private source dumps. These files are authoring references, not publish inputs or attachments.

## 5. Writing Quality & Editorial Standards

- **Finished Reader-Facing Prose**: Write complete, well-reasoned articles. Avoid outlines, questionnaires, placeholders, or corporate filler.
- **Engaging Voice**: Direct, conversational, and specific. Open with the substantive news, central argument, or tension—do not start with generic "In today's fast-paced digital world" openings.
- **Accurate Claims**: Do not invent benchmarks, customer quotes, or test results. Explain principles with concrete, supported examples.
- **Clean Markdown**: Use standard GFM headings (`##`, `###`), tables, fenced code blocks, and blockquotes. Never use `<h1>` in the body (the page renders the title).
