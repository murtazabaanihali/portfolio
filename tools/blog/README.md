# Portfolio blog

Server-rendered Next.js/OpenNext blog, public R2 Markdown, and a **local-only** Bun authoring/publishing tool. Coverage/related-article lookup uses PostgreSQL `blog_posts` metadata and local drafts only. Content serving and publishing remain R2-backed. No hosted generation, queues, or migrations are run by this tool. Existing Drizzle project tables are unchanged.

## What ships

- `/blog`: editorial list, metadata-only search, category/tag links, ordinary pagination.
- `/blog/<slug>`: full server HTML, GFM, anchors/TOC, reading time, accessible tables/code, cover, dates, canonical/social metadata, BlogPosting/Person/breadcrumb JSON-LD.
- `/blog/<slug>/raw.md`, `/blog/index.json`, `/blog/rss.xml`, `/llms.txt`, and extended `/sitemap.xml`.
- CLI and Ink TUI share one publishing core. External agents need no AI provider. See [AGENTS.md](AGENTS.md).
- Optional paid OpenRouter text/image generation and optional free best-effort research.

This is a broad blog, not just technical articles: news, opinions, guides, explainers, marketing, business, and other subjects are welcome. Categories are editable navigation labels in `lib/blog/config.ts`, not topic restrictions. Alongside the original categories, **AI News**, **Marketing & Growth**, **Business & Ecommerce**, **Technology**, and **Perspectives** cover broader posts; Perspectives is the general-purpose section. Existing category slugs remain valid. Filters/search/pagination are crawlable but `noindex, follow`; the unfiltered listing and posts are canonical. Empty tag/category SEO pages are not generated. Machine-readable formats improve accessibility to crawlers; they do not guarantee ranking or AI citations.

## Provisioning (operator action; not performed by implementation)

1. Create an R2 bucket named `portfolio-blog`, or edit its name in `wrangler.jsonc`. Bind it as `BLOG_CONTENT` on the existing Worker. The blog does not use the incremental-cache bucket.
2. Attach a public custom domain to that bucket. Set `BLOG_CDN_URL` to its HTTPS **origin**, with no path/query. `r2.dev` is intentionally rejected for production CDN use. Drafts and staged objects share this public bucket. Editorial status is **not** access control.
3. Configure `NEXT_PUBLIC_APP_URL` as the permanent portfolio origin, at build time and in the Worker environment. The owner-selected value is shown in `.env.example`. Do not change the DHEM redirects. Set `BLOG_CDN_URL` and optional `BLOG_AUTHOR` for the Worker and local tools. Existing portfolio/image configuration remains intact; blog images use ordinary CDN `<img>` URLs, not another image-cache layer.
4. For local publishing only, export the bucket-scoped `BLOG_R2_ACCOUNT_ID`, `BLOG_R2_BUCKET`, `BLOG_R2_ACCESS_KEY_ID`, and `BLOG_R2_SECRET_ACCESS_KEY`. **Never add S3 or OpenRouter credentials to Wrangler bindings/vars or tracked files.** The app uses the Worker R2 binding, not S3 credentials. Do not expose the S3 endpoint as the content CDN.
5. Initialize a new bucket explicitly: `bun run blog init --yes`. This writes empty published/editorial state. Missing active state thereafter is an outage, not an empty blog; investigate before initializing an existing bucket.
6. Build/deploy the existing Worker using the repository's documented process when authorized. Publishing later articles does **not** rebuild or redeploy the site.

The implementation never edits the owner's `.env`. Bun loads `.env` normally when launched from the repository; from another working directory, export environment variables explicitly (or use Bun's `--env-file` option). `blog-context.md` resolves relative to this tool by default, not your shell's working directory. `.dev.vars.example` documents only Worker runtime configuration.

### Cache configuration

Blog HTML uses `force-dynamic`. R2 binding reads bypass the CDN and fetch the current head, published manifest, and article at request time. React `cache()` only deduplicates within one server render. There is **no ISR, process TTL, persistent incremental cache, stale-on-error manifest, or repeated bucket listing** in the reader path.

HTML and JSON/RSS/Markdown/llms responses are `no-store`; the dynamic Next sitemap has zero-age/must-revalidate semantics. Versioned objects and covers use `public, max-age=300`. Corrections create new object URLs and switch one head; the normal reader path updates on the next request, within the five-minute allowance. No independent five-minute manifest/HTML caches stack up.

**Do not add a Cloudflare Cache Everything/Page Rule with an Edge TTL override** for `/blog*`, `/llms.txt`, or `/sitemap.xml`. Configure the R2 custom-domain cache to respect origin cache-control rather than override it. Exempt mutable `blog/head.json` and `blog/publishing.lock` from CDN caching. The website does not read these via CDN, but external copies must not be treated as current. Open browser tabs, browser history/back navigation, offline caches, arbitrary intermediary overrides, and third-party copies are outside the server freshness bound.

## Content format

See [examples/post.md](examples/post.md) and the strict schemas in `lib/blog/contract.ts`.

```yaml
---
version: 1
title: A useful article title
slug: a-useful-article
description: A clear description long enough to explain the article's value.
author: Murtaza Baanihali
status: draft
category: ai-agents
tags: [ai-agents, typescript]
publishedAt: null
updatedAt: null
cover:
  src: ./cover.png
  alt: A paper task card inside a clearly marked boundary
---
```

- Ordinary GFM; no executable MDX or embedded raw HTML. Tables, fenced code, images with alt text, links, headings, and reference-style links are supported.
- Tags normalize to lowercase hyphenated strings and deduplicate. Slugs cannot silently change in an existing workspace.
- Cover: public HTTPS URL, managed `blog/objects/...` key, or a supplied local `./cover.png`, `./cover.jpg`, `./cover.jpeg`, `./cover.webp`. Local covers are imported into owned storage. No SVG or executable media. Managed uploads are limited to 10MB and Markdown to 500KB.
- Publication dates are timezone-explicit ISO-8601 instants. First `status ID published` assigns dates. Published edits preserve `publishedAt`, set a meaningful later `updatedAt`, and invalidate approval. There is no future scheduler. Unpublish preserves original publication time; republishing does not reset it.
- `status` controls editorial discovery, not privacy. Raw public R2 drafts can be discovered by third parties even though all website discovery excludes them.
- Metadata fields are single-line text. Links are validated, raw HTML is rejected, JSON-LD escapes script delimiters, XML is escaped. Derived TOC/reading time need not be maintained by authors.

## Author/import/review/publish

```sh
bun run blog import /path/article.md --cover /path/cover.png
# Save the returned ID. Originals are never cleanup targets.
bun run blog validate ID
bun run blog status ID published
bun run blog plan ID --out /tmp/blog-plan.json
bun run blog approve ID
bun run blog publish --plan /tmp/blog-plan.json
```

Review the real Markdown/frontmatter diff and cover URL/hash changes. An approval applies to the exact raw article + cover bytes. Editing either invalidates it. A saved plan binds all selected workspace fingerprints and the remote head ETag. Commit re-plans and refuses any mismatch. An authorized noninteractive caller may pass `--yes` to approve the exact current plan instead of storing interactive approvals.

`publish` is also the remote **draft-save** operation: a draft workspace remains a draft, is stored in the public bucket/editorial inventory, and is excluded from the published manifest. The command name does not force status to published.

```sh
bun run blog list                 # editorial inventory, including drafts
bun run blog fetch existing-slug  # editable owned workspace, revision-bound
bun run blog workspaces
bun run blog unpublish existing-slug --dry-run
bun run blog unpublish existing-slug --yes
bun run blog delete existing-slug --yes
bun run blog gc                   # list eligible objects only
bun run blog gc --yes             # explicit physical cleanup after grace
bun run blog clean ID --yes       # explicit discard of owned LOCAL work
bun run blog reject ID --yes      # completely remove draft everywhere (local, DB, remote)
```

A fetched workspace refuses to overwrite a newer remote revision. Missing local files never imply removal. Published-to-draft is classified as **unpublish** and requires explicit CLI authorization. Delete removes the editorial entry; physical objects become eligible for GC after retention. Public CDN copies and third-party caches are **not instantly erased** by unpublish/delete/GC.

All CLI command results are JSON; errors go to stderr. Exit codes: `0` success, `1` failure/partial generation, `2` bad input, `3` conflict/replan, `4` missing explicit authorization. `--dry-run` is accepted only by plan/publish/unpublish/delete/gc and never generates, uploads, deletes, switches state, or cleans local work. Other commands reject it before performing an action.

### Batches

Import multiple files with `import-batch files.json`, where the JSON is an array of `{ "file": "/absolute/post.md", "cover": "/absolute/cover.png" }` (cover optional). Each result is independent; failures do not erase successful imports.

Publishing action manifest:

```json
{
  "version": 1,
  "actions": [
    { "type": "upsert", "workspace": "UUID-returned-by-import" },
    { "type": "unpublish", "slug": "explicit-old-slug" }
  ]
}
```

```sh
bun run blog plan --batch actions.json --out /tmp/review.json
bun run blog publish --plan /tmp/review.json --dry-run
bun run blog publish --plan /tmp/review.json --yes
```

Selected publishing batches are all-or-nothing at the **head switch**, not multi-object R2 transactions. Uploaded staging objects can exist publicly before commit. Upload failure preserves every selected workspace; successful commit cleans only selected, unchanged tool-owned UUID directories. Partial generation/import batches retain successful items for selected retry/publication.

### Atomic activation and cleanup

`blog/head.json` points to separate versioned manifest and editorial inventory objects. The public discovery API exposes metadata and canonical/raw URLs, never inventory keys, internal state, or draft entries. Every mutating remote command acquires the same conditional absent-only `blog/publishing.lock` **before staging**. Uploaded Markdown/covers/manifests are read back and hash-verified. The final head replacement is a conditional S3 `PutObject` (`If-Match`, or `If-None-Match: *` for explicit initialization). A competing baseline is rejected, never overwritten. An ambiguous write timeout is reconciled by reading back the unique commit ID.

The inventory tracks current article/managed-asset references across drafts and published posts, plus retirement times. GC retains current manifest/inventory/content and shared assets, gives superseded references **15 minutes from retirement** (not their creation date), and gives abandoned stages 15 minutes from upload. GC holds the same publishing lock, so it cannot race an in-progress stage. This is temporary reader protection, not revision history or rollback. Run GC deliberately after publication; no hosted cron/queue is added. Files on the public CDN may outlive R2 deletion until cache expiry.

Successful remote publication and local cleanup are distinct results. `committed: true` with `cleanupWarnings` means the remote commit succeeded: inspect the warning, do not blindly republish. Cleanup never removes original imports, source repositories, configuration, `.env`, this tool, or persistent context. Failed/unpublished work is retained. Workspace symlinks are refused.

### Recovering an interrupted publisher safely

Locks deliberately do not expire: automatic takeover could let a stalled writer commit or upload while GC deletes its stage. If a process dies after acquiring the lock:

1. Stop **all** publishing, initialization, GC, and recovery processes that can access this bucket, including other machines. Verify none can resume. Never unlock a merely slow/paused publisher.
2. Run `bun run blog lock-status`; inspect the exact owner UUID and start time.
3. Inspect `list`, your saved plan/local workspace, and the active head to determine whether the commit completed. A crash after head switch may leave successfully committed work locally. Do not treat that as a failed remote publish.
4. Only after exclusive downtime is established: `bun run blog unlock OWNER_UUID --yes --no-active-writers`.
5. Fetch/replan against current state. Never reuse an uncertain approval or force an old ETag. Use `gc` dry-run after the grace period to inspect abandoned staging objects.

Manual unlock compares the owner but is not a distributed lease/fencing system. Its explicit precondition is that all writers/recovery processes are stopped; do not run concurrent unlock commands. Lock-release failures are reported visibly without turning a verified successful remote commit into a false publication failure.

## TUI

`bun run blog:tui` opens Ink-based Blog Studio. Arrow keys/j/k select drafts, space selects a batch, `v` (or Enter) previews rendered Markdown and focuses the preview pane with a visual scrollbar. Heading markers are hidden; tables use labeled rows instead of overflowing ASCII grids. Preview content is re-rendered from the original Markdown when the terminal resizes, rather than retaining old line breaks. In preview mode, ↑/↓ or j/k scrolls line-by-line, PageUp/PageDown scrolls page-by-page, Home/End jumps to top/bottom, and Esc/Tab/Left/`v` returns to the draft list. From the draft list, Tab or Right arrow focuses the preview, and J/K, Alt+↑/↓, or PageUp/PageDown scroll the preview directly. `d` shows text/frontmatter/cover diff, `a` approves exact revisions, `s` changes local editorial status, `p` requires typing `publish` to commit the reviewed plan, `x` rejects draft(s) with confirmation (`reject` or `y`) to completely remove them everywhere (local workspace, DB mirror, and remote inventory). `$EDITOR` opens with `e`; set it to an executable or wrapper script (no shell interpolation). `c` offers iTerm inline-cover output and `o` opens the system viewer; other terminals use the explicit viewer fallback. `q` exits.

`g` accepts a brief JSON path; `r` accepts AI revision instructions; `i` retries/reuses a generated cover. These keys are explicitly labeled as potentially paid operations. CLI `cover ID --yes --regenerate` deliberately replaces a successful cover. TUI source links, actual models, and research warnings appear with preview. Invalid workspaces remain visible as needing attention.

## Related articles, coverage checks, and autonomous batches

Press **`n` in Blog Studio** to open the autonomous wizard:

1. Press **`t` to type your own topic** (3–700 characters), including the angle/tone if desired. This skips the suggestion call and defaults to one post. Or press Enter to authorize **LLM suggestions**: 3–8 varied topics using your maintained voice/context and DB/local coverage, not a fixed category menu. Select with ↑/↓ and Space; `t` is also available from this list. Press `r` for fresh suggestions (another paid-call confirmation). DB/provider failures show an error and allow an explicit retry, not a predefined fallback.
2. Enter a post count (1–10).
3. Choose **local drafts** (default) or **auto-accept and publish live** with `p`.
4. Toggle `o` to continue on likely covered topics with a distinct angle. Existing slugs are always protected.
5. Type `draft` or `publish` to explicitly authorize paid calls and, for publish mode, unattended live publication for this batch.

This is a bounded local run, not a recurring background scheduler. It stops after processing the requested plans; skipped/failed plans are reported rather than replaced with unbounded paid retries. Existing model fallback/timeouts still apply. There is no monetary spending cap: count limits articles, not provider charges. Review mode and count before confirming.

```sh
bun run blog suggest --yes             # LLM-generated direction objects, no articles/publishing
bun run blog related 'transactional email retries'
bun run blog generate tools/blog/examples/brief.json --yes --allow-existing-topic
bun run blog autonomous tools/blog/examples/autonomous.json --yes
# For a reviewed config with "mode": "publish", BOTH authorizations are required:
bun run blog autonomous /path/live-batch.json --yes --auto-publish
```

The batch file contains `directions` (selected LLM `{id, label, detail}` objects, or free-text descriptions for CLI use), `count`, `mode` (`draft` or `publish`), and `allowExistingTopic`. Directions are not restricted to predefined IDs. The TUI passes selected objects intact to the planner, including each proposed scope and angle. `suggest --yes` returns suggestions only; select the desired objects and add the other batch fields before running `autonomous`. A single-generation brief also accepts `allowExistingTopic: true`. The CLI flag overrides that field. A topic override permits a **new-angle follow-up**, never replacing an existing slug. Editing remains the explicit `fetch`/review/publish workflow.

### Query and cache behavior

`catalog.ts` reads only PostgreSQL `blog_posts` metadata through the project's Drizzle connection (`DATABASE_URL`) and local workspaces. It never searches R2 or falls back to the bucket. One metadata-only SELECT loads slugs, titles, descriptions, categories, tags, and status; matching happens against the cached snapshot. No article-body downloads, DB writes, or row locks are involved. DB results are cached **in process for 60 seconds**, concurrent reads coalesce, and TTL expiry/invalidation triggers another SELECT. Local workspaces are rescanned so new drafts participate immediately. Cache lifetime ends with the CLI/TUI process; it is not a persistent cross-process cache.

**DB prerequisite:** `lib/db/blog-schema.ts` defines the expected table, but this change does not provision, backfill, or synchronize it. The current publisher still writes content/manifests to R2, not this DB mirror. Include the blog schema in the migration configuration before an operator-authorized migration, and populate/maintain the mirror through your DB ingestion workflow. An empty/stale DB cannot detect missing coverage or guarantee that its published URLs remain live. Missing tables/credentials are surfaced as lookup failures, not treated as an empty catalog.

Related published articles (up to six) and their canonical URLs enter the writing prompt. Local drafts and DB draft rows participate in duplicate checks but never become suggested links. Exact slug matches are blocked; strong title/slug token overlap flags likely covered topics. This is a cheap lexical heuristic, **not semantic certainty**: paraphrases can be missed, and distinct articles can share vocabulary. Relatedness alone does not block a topic. Use the override deliberately when a follow-up adds value.

Manual generation can continue as a local draft with a visible warning if DB coverage is unavailable (local drafts are still checked). Autonomous batches require a successful fresh DB read before any paid planning and recheck coverage immediately before live publication. Cached search is advisory, never a substitute for the existing lock/ETag optimistic concurrency protections at commit time.

### Writing and publication safeguards

The planner receives the current date, selected topics, maintained author context, and up to 200 existing post summaries to bound prompt size. Each planned post is checked against the **entire** catalog, including earlier plans in the batch. The original selected topics also reach the writer, so a planning brief should refine—not replace—the requested subject. DHEM/product facts are optional background, not mandatory subject matter; DheGEN remains name-only until its capabilities and canonical URL are supplied.

`prompts.ts` defines the broad blogging scope and separate suggestion/planning/writing instructions. The writer is explicitly asked for a **finished reader-facing blog post**, with connected prose and a natural news/opinion/guide/explainer shape—not a questionnaire, worksheet, formal report, or fixed checklist/limitations template. The user message carries an explicit writing task, the topic brief, post type, date, original topic, source material and warnings. There is still **one writing stage and no added draft reviewer**. Prompt guidance improves the target; it is not proof that every model output is good or factual. Truncated model responses are rejected through the existing bounded provider fallback.

Draft mode never uploads generated posts. Live mode retains its existing advisory model review, rejects unknown internal links, checks for coverage changes, accepts only new posts, and uses the existing atomic publishing core. Incomplete covers, source/coverage warnings, review rejection, conflicts, or errors retain local drafts for inspection. A model review is **not independent factual verification**; review sensitive/product-specific material yourself.

Autonomous planning can now request the existing free best-effort research for current topics, with a short neutral `researchQuery`. News posts and obvious dated/current-event briefs also trigger research if the planner omits it. There is no repository scanning or paid search. Source text, page-versus-snippet labels, retrieval times and warnings reach the writer. A supplied headline/model name is not evidence that a release exists; when the premise cannot be established, the prompt requires an honest unconfirmed framing or a narrower supported angle, not invented announcements.

Results distinguish `draft`, `published`, `held-draft`, `skipped-covered`, and `failed`, with workspace IDs and reasons. Read commit cleanup warnings separately; do not republish a committed article because cleanup failed. Do not automatically recover a stranded publishing lock. Generated workspaces survive failed publication; restarting is a new planning request, not a durable job-resume service.

## Optional AI and free research

Briefs accept `postType` (`auto`, `news`, `opinion`, `guide`, `explainer`; default `auto`) and an optional `researchQuery` (3–300 characters), in addition to `research`. Evergreen posts need not research. News/current-topic detection is a heuristic backstop; explicitly set `research: true` and a query when freshness matters. Queries and selected URLs leave the machine for research. Revision uses the existing draft and context without fetching fresh sources, and is instructed not to treat unsupported old claims as evidence.

Configure ordered comma-separated `BLOG_TEXT_MODELS` and `BLOG_IMAGE_MODELS` (maximum five each), `OPENROUTER_API_KEY`, and optional `BLOG_AI_BASE_URL`. The text adapter uses the OpenAI SDK; the image adapter uses the currently documented OpenRouter `POST /images` request (`model`, `prompt`, `aspect_ratio`, `n`) and `data[].b64_json` response. This is not an assumption that every provider implements identical image APIs. A replacement endpoint must support this boundary or update the small adapter.

```sh
bun run blog generate tools/blog/examples/brief.json --yes
bun run blog generate /path/brief-array.json --yes
bun run blog cover ID --yes                    # reuse success; retry a missing cover
bun run blog revise ID --instructions 'Clarify the trade-offs without adding claims' --yes
```

Each model gets at most two attempts, then the next configured model; text timeout 90s/image timeout 120s, writing output capped at 6,000 tokens. The returned model identifier is recorded as `textModel` (falling back to the requested identifier if absent), with `requestedTextModel` stored separately. Local-only `generation.json` records the normalized brief, original selected topics, prompt version, date and model identifiers for diagnosis; it is never uploaded by the publisher. Existing drafts are not automatically rewritten after prompt changes—use explicit revision or create a distinct post. Article generation runs sequentially so completed drafts participate in subsequent coverage checks. Text survives cover failure and returns its workspace ID. Repeating the same normalized brief reuses a matching extant workspace and retries only missing cover work; explicitly import/generate a changed brief to start another article. Matching ignores changes to files referenced by the same brief: review/revise explicitly when source/context contents change. Once a workspace has been committed and cleaned, a new generate call is a new generation request. The `generate` command never publishes. The separate `autonomous` workflow can publish only with explicit live-mode authorization.

Only explicitly selected text files and supplied URLs are used. Local source files are capped at 100KB, deny common credential files/directories and private key/token patterns, and are never scanned recursively. **Selection sends their text to the model provider.** Automated secret detection is not a guarantee; inspect inputs. Raw private sources and research are never included in R2 uploads. Persistent context is supplied to generation but not uploaded wholesale to R2. URL fetches require public HTTPS, validate every redirect, pin the checked DNS addresses for connections, limit response size, and use timeouts.

Free research uses DuckDuckGo HTML and independent Bing RSS adapters, not two wrappers around one backend. Up to three attempts per backend with backoff, shared default 25s budget (max 60s), and bounded page fetches. No paid-search fallback, CAPTCHA evasion, browser automation, or paid OpenRouter web-search plugin. Search/page failures are **nonblocking warnings**. Snippets are not fresh verification. Omit/qualify unverified current prices/releases rather than inventing evidence. These public endpoints can change or be blocked; replace adapters without changing publishing logic. Supplied sources and evergreen writing remain usable when all search fails.

`blog-context.md` is populated locally and gitignored; `blog-context.example.md` contains the public-fact seed/reference. Both built-in generation and external-agent instructions use the actual file. It includes known product links and uncertainty notes, including the unavailable Tajven page. Context is human-maintained and survives cleanup.

## Verification

```sh
bun run blog:test
bun run blog:typecheck
bunx tsc --noEmit
bun run lint
bun run cf:build
# LOCAL R2 fixture only; overwrites local blog fixture state, never remote state:
bun tools/blog/seed-local.ts --yes
bunx opennextjs-cloudflare preview --port 8787
# In another terminal:
bun tools/blog/smoke-worker.ts
```

The local fixture includes one published article and one hidden draft. It is deliberately not a production post or a usable production cover. Inspect `/blog/local-preview-fixture` HTML source, raw Markdown, discovery headers, filtered-page robots, and draft 404 behavior. Core tests use in-memory conditional storage and mocks: failures/conflicts, exact approval, date/slug preservation, successful-only cleanup, draft exclusion, GC grace/shared assets, secret rejection, and bounded fallback. No test needs live R2, AI credits, or a database migration.

Actual R2 S3 credentials, CDN provisioning/cache rules, live multi-client conditional writes, and paid provider output still require operator-authorized integration checks. Local Worker preview proves binding access and deployed-runtime rendering, not the behavior of an unprovisioned public CDN. TUI rendering/viewer compatibility varies by terminal.

## API references checked during implementation

- https://opennext.js.org/cloudflare/bindings — `getCloudflareContext({ async: true })`, local bindings/preview.
- https://developers.cloudflare.com/r2/api/s3/api/ — atomic conditional PutObject support.
- https://developers.cloudflare.com/r2/reference/consistency/#conditional-writes
- https://developers.cloudflare.com/r2/buckets/public-buckets/
- https://openrouter.ai/docs/guides/overview/multimodal/image-generation — dedicated `/images`, base64 output.
