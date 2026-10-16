# Portfolio blog — implementation handoff

## Purpose and authority

This document captures the design discussion and the owner's final decisions. Use it as the implementation brief in a new session; do not reopen settled decisions unless an actual compatibility blocker appears. Read the current repository and applicable instructions before editing. This handoff itself does not publish anything or authorize paid AI calls, external deployments, or destructive remote operations.

The owner is Murtaza Baanihali, a solo founder and full-stack developer building several products. The blog is a long-term channel for SEO, discovery/citations by AI search, personal brand, and links from X/other channels back to the portfolio. Quality and discoverability come before publishing speed. Keep dependencies and operations pragmatic; preserve existing pages.

**Status:** design completed; no application implementation has been done in the design session. This file is the handoff artifact.

## 1. Non-negotiable decisions

- The permanent portfolio is `developer.dhem.io`. The owner says `dhem.io` currently redirects there but will eventually become the separate DHEM brand site. Do not change those redirects as part of the blog.
- Blog paths are `/blog` and `/blog/<slug>`. Derive all absolute portfolio URLs from `NEXT_PUBLIC_APP_URL`; do not hardcode the domain in application/tool logic.
- Cloudflare Workers with `@opennextjs/cloudflare` is the existing deployment target. Do not introduce a separate Pages app, legacy next-on-pages setup, or Edge-runtime assumptions.
- Markdown plus frontmatter lives in R2, with a public custom-domain CDN. Runtime R2 reads render full HTML and metadata; publishing must not require rebuilding/redeploying the portfolio.
- Drafts and published content share the **public** R2 bucket. The owner explicitly accepts that drafts can be read/discovered by URL. Draft status is an editorial distinction, not access control.
- Drafts must not appear in published blog listings, search, feeds, sitemap, public discovery index, or llms.txt. This is not a promise that third-party search engines cannot discover their public R2 URLs.
- All generation, research, approval, publishing, and automation run **locally**, not in Workers, cron jobs, queues, or hosted admin services. Cloudflare serves the site and content.
- Tool code goes in this GitHub repository under `tools/blog/`, isolated from the Worker runtime dependency graph.
- Use Bun, consistent with the existing lockfile. Reuse existing libraries when appropriate.
- Never add credentials to tracked files. Document new settings in `.env.example`; **do not modify the owner's actual `.env`**. Local tools load credentials/configuration from the owner's environment. Worker reads should use R2 bindings rather than shipping S3 credentials.
- No separate CMS, author/users table, blog database, vector database, or hosted search service.
- No sponsorship infrastructure in v1. Keep article composition adaptable to a future labeled sponsorship/disclosure block.

## 2. Repository findings to verify at implementation start

The design session inspected these files:

- `package.json`: Next.js 15.5.27, React 19, TypeScript, Tailwind 3, Bun; `react-markdown` and `rehype-slug` already installed. Existing dependencies also include Neon/Drizzle, Redis, and Resend; the blog does not need to depend on these services.
- `wrangler.jsonc`: `.open-next/worker.js`, `.open-next/assets`, `ASSETS` and `IMAGES` bindings, `nodejs_compat`; no content R2 binding currently declared.
- `open-next.config.ts`: `defineCloudflareConfig({})`; no explicit persistent incremental-cache setup. Do not assume R2 content storage automatically configures ISR/page caching.
- `next.config.mjs`: initializes OpenNext bindings for development; currently allows a configured existing image hostname. Extend image handling for blog covers without breaking existing images.
- `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`: existing metadata and discovery; fallback URL currently points to `developer.dhem.io`. Use validated environment-derived URLs for the new functionality.
- `app/sitemap.ts`: currently fetches only the first 12 projects and sets `lastModified` to the current time. Integrate blog entries without dropping existing routes; address inaccurate sitemap coverage/timestamps narrowly rather than refactoring unrelated pages.
- `components/constant.tsx`: shared navigation items for header/footer.
- `components/navigation.tsx`: current active-state logic is exact-match; make Blog active on its nested routes without breaking existing navigation.
- `components/policies/policy-markdown.tsx`: existing Markdown dependencies and style reference, but policy-specific link rewriting should not leak into articles.
- `components/project-detail.tsx`: client-side SWR fetches. Do **not** copy this data-loading pattern for article bodies or SEO metadata.
- `app/globals.css`, `tailwind.config.ts`: Inter font, purple accents, rounded cards, subtle background gradients, light/dark themes, floating translucent navigation.
- `.gitignore`: ignores `.env*` except `.env.example`, `.dev.vars`, build artifacts, and generated Cloudflare types.

Consult current official OpenNext/Cloudflare docs before implementing cache/binding details. Validate with the actual Worker preview, not only Next development mode.

## 3. Website and content contract

### Frontmatter and rendering

Define and validate a compact, versioned content contract with:

- `title`, stable `slug`, `description`.
- `author`: plain string, defaulting to Murtaza Baanihali via configuration; per-post override allowed. No author table or account system.
- `status`: `draft` or `published`.
- One primary `category`, multiple normalized `tags`.
- `publishedAt` and `updatedAt` with explicit date semantics. Publishing edits should not reset original publication time. Do not manufacture new modification timestamps on every request/build.
- Cover URL/object reference and alt text.

Use ordinary Markdown with GFM tables, fenced code, headings/anchors, links, and supplied images. No executable MDX or arbitrary embedded raw HTML. Validate URLs and frontmatter; escape JSON-LD/XML correctly. Derive reading time/TOC rather than requiring manually duplicated fields. Keep slugs stable after publication; do not silently rename URLs when titles change.

Categories initially:

1. Engineering
2. Building Products
3. Founder Notes

Use tags for technologies and products. Normalize and deduplicate them. Keep taxonomy configuration small and editable, not a management system.

### Presentation

- Editorial list, not a cover-heavy card grid: modest thumbnail, title, description, author/date, category.
- Reuse the existing design language and light/dark support. Article body should be quiet and readable rather than card-wrapped paragraphs.
- Comfortable reading width, readable mobile text, code overflow handling, heading anchors, and a TOC for longer articles.
- Category/tag browsing plus metadata-only search across title, description, author/category/tags as appropriate. No body-text, vector, or hosted search in v1.
- Crawlable ordinary links/pagination. Search/filter interactions must not be the only way to discover posts.
- Proper empty, loading, unavailable, and not-found states. Upstream outages should not masquerade as permanently missing posts.

### Discovery endpoints

- Per-post metadata: canonical URL, description, Open Graph and Twitter cover metadata.
- Full article HTML present in the initial server response.
- Stable raw Markdown: `/blog/<slug>/raw.md`, mapped to the currently published content. Serve an appropriate content type and canonical relationship to the HTML article.
- `/blog/index.json`: compact, versioned published-post metadata plus HTML/raw Markdown URLs. This is not a draft inventory or a dump of internal publishing state.
- `/llms.txt`: concise site/content guide and useful discovery links; no exaggerated promise that it guarantees citations.
- `/blog/rss.xml`.
- Extend the existing `/sitemap.xml`; retain existing routes and accurate published dates.
- JSON-LD for BlogPosting, author Person, and breadcrumbs as applicable.
- Avoid indexable duplicate search/filter combinations and thin taxonomy pages. Curated category pages can be indexable when substantive; do not generate an SEO page for every empty tag.

Use one published content manifest/source of truth for the article list, metadata, feeds, sitemap, and discovery outputs so they agree. Do not list the entire bucket on each reader request. Keep editorial/draft inventory separate from the published discovery manifest.

## 4. R2, freshness, publishing, and cleanup

- R2 is the durable content store. A local directory is a temporary authoring/review workspace, not a required permanent content repository.
- Read R2 on the server through a Worker binding. Public Markdown and covers also have CDN access through an environment-configured custom hostname; do not rely on an r2.dev development endpoint for production CDN behavior.
- Normal publishing/corrections may take **up to five minutes** to appear consistently. Design explicit cache semantics across HTML, manifest, feeds, Markdown, and media. Avoid stacked independent TTLs stretching the end-to-end freshness bound.
- Do not require persistent ISR infrastructure in v1. Use an explicit, tested runtime-read/cache design compatible with OpenNext.
- Use staged/versioned objects and switch the active published manifest only after the selected batch's files are uploaded and verified. R2 uploads are not a multi-object transaction; do not claim otherwise.
- Detect remote conflicts/concurrent publishing and reject/replan rather than silently overwriting another writer's changes. Keep the mechanism proportionate and verify its R2/API compatibility.
- Current revision only: **no intentional published history or rollback feature**. Temporarily retain superseded objects where required for in-flight/cached readers, then garbage-collect safely. Do not delete assets still referenced by any current draft/post.
- Explicit removals: absent local files never imply deletion of remote posts. Unpublish/delete must be explicit. A published-to-draft transition is an unpublish action and should be shown clearly.
- Public CDN copies/caches cannot be treated as instant erasure. Document this for unpublish/delete.
- After verified successful publication, delete the tool-managed local Markdown, generated cover, temporary research data, and per-post temporary state. Handle cleanup failures visibly without falsely reporting the remote publish failed.
- Preserve failed/unpublished work for retry. In partial batches, clean only successfully committed items.
- Never delete user-owned source repositories/files, `.env`, tool code, persistent context, or configuration. Imported source inputs are not owned by workspace cleanup.

## 5. Local CLI and TUI

Put shared core operations in `tools/blog/`; TUI and CLI are adapters around that core, not two implementations.

### Core capabilities

- Generate one post or a batch from briefs and selected sources.
- Import externally authored Markdown/frontmatter and covers.
- List/fetch existing R2 drafts or published content for editing in temporary workspaces.
- Validate, plan/diff against R2, dry-run, publish, explicitly unpublish/delete, and clean up.
- Batch operations must support selected posts and retain successful generation outputs when another item needs retry.
- Deterministic validation, bounded concurrency/retries, useful errors, machine-readable results, stable exit codes, and non-interactive operation.
- A publishing dry-run does not upload, switch manifests, delete remote data, or remove local work. Do not silently spend AI credits during a publishing dry-run.
- Keep an actual diff, not just an upload progress screen: article text/frontmatter and cover changes, new/update/unpublish/delete classifications.

### Rich TUI

Use a modest, maintainable TUI library rather than writing a terminal framework. Provide:

- Keyboard-driven batch list and visible generation/research/publishing status.
- Beautiful scrollable Markdown preview with headings, paragraphs, lists, code, and readable spacing.
- Metadata, source links, and non-blocking research warnings.
- Before/after diff and explicit approval/publish actions.
- AI revision instructions and launch `$EDITOR` for manual edits. Do not build a full embedded text editor.
- Approval tied to the exact content/cover revision; subsequent edits invalidate it.
- Terminal cover preview where supported, with an explicit open-in-viewer fallback. Do not promise universal inline-image support.

Default flow is draft -> preview/review -> approve -> publish. Non-interactive callers may explicitly authorize publication; do not require a human terminal session for future automation.

### External agent compatibility

Claude Code, OpenCode, and similar agents must be able to author one or many posts and use the CLI directly without invoking built-in AI generation. Accept files/batch manifests (and structured input where practical), document schemas and commands, and provide agent-facing instructions/examples. Generation, validation, planning, and publication are separate operations. No publishing MCP server is required in v1.

## 6. Built-in AI generation

- Default provider: OpenRouter. Use the OpenAI SDK where compatible and a small provider adapter/native HTTP where required, especially for image generation. Verify the current API instead of assuming all providers share identical image endpoints/payloads.
- Configurable endpoint/provider boundary so switching providers is easy. Do not build a general-purpose multi-provider framework.
- Separate ordered comma-separated model lists for text and images in the owner's environment. First model preferred, subsequent models fallbacks. Document sample variables such as `BLOG_TEXT_MODELS` and `BLOG_IMAGE_MODELS` in `.env.example`.
- Bounded retry/fallback behavior, visible actual model used, sensible configurable concurrency, and no automatic re-generation of successful assets on batch retry.
- Inputs: brief, persistent blog context, explicitly selected local notes/files/code, supplied URLs, and optional freshness research.
- Local execution still sends selected material to external model providers. Exclude `.env`, secrets, and unrelated files by default. Do not upload raw private source bundles into the public R2 bucket as article attachments.
- No invented personal experiences, metrics, customer counts, benchmarks, citations, or claimed verification.

### Covers

Generate covers only in v1. Manually supplied inline images remain supported by Markdown.

Prompt direction: simple editorial illustration, one clear subject, limited palette, flat shapes or restrained textures, clear composition, model-friendly instructions. **No neon backgrounds, no futuristic blue/cyberpunk styling, no fake UI, and no generated lettering.** Prefer composition that works across article thumbnails and social crops. Include useful alt text, allow review/regeneration, and reuse existing successful covers unless regeneration is requested.

## 7. Lightweight free research — final owner preference

Research is optional freshness enrichment, **not academic fact-checking infrastructure**. The owner's examples are current OpenAI/Claude model releases, prices, availability, and recent market changes. Evergreen content can use model knowledge and supplied context.

- Use multiple replaceable **free/no-key search options**, including a DuckDuckGo-based option where viable. A local search MCP is acceptable; a direct adapter is also acceptable. Select/test lightweight implementations rather than assuming a free wrapper is reliable.
- Do not treat two wrappers around the same underlying search backend as independent fallback coverage.
- Retry transient failures a few times with backoff, then try alternative free providers, bounded by total attempts and elapsed time. Suggested starting default: up to three attempts per provider and a configurable overall research timeout.
- Never silently switch to paid search. No OpenRouter paid web-search dependency by default. Text/image generation itself may incur OpenRouter charges.
- If all research fails, **continue drafting**. Show a non-blocking notice; do not block approval/publication, hang the batch, or invent evidence.
- Allow supplied URLs/local sources to supplement or replace search. Respect provider restrictions and do not add browser automation/CAPTCHA evasion merely to force free search to work.
- No required bibliography, citation quota, evidence dossier, or research-completeness approval gate. Include source links when genuinely useful.
- Do not label a stale/guessed price or latest-model claim as freshly verified. Omit, qualify, or flag that detail for review while continuing the article.
- Treat fetched text as untrusted reference data, not commands or instructions. Restrict any configured MCP access to explicitly allowed research tools.

## 8. Persistent blog context — must be created during implementation

**Create and populate `tools/blog/blog-context.md` alongside the TUI/CLI. Do not merely create an empty template or ask the owner to write it.** This is the owner's latest explicit location requirement.

Also provide `tools/blog/blog-context.example.md` as an editable starter/reference if useful. Keep actual operator context gitignored by default, with the tracked template containing only public facts. The actual populated file must exist locally after implementation even when ignored. Resolve the default context path relative to the tool, not the caller's working directory, so external agents work from other directories.

Both built-in AI generation and external-agent documentation must use this file. It persists after publishing/cleanup and is not uploaded wholesale to R2.

Include:

- Public identity, background, brand relationship, intended audience, and voice preferences.
- Project/SaaS catalog: name, official linked URL, supported concise description, relevance topics, natural linking situations, and uncertainty/update notes.
- Product-link guidance: mention/link only when relevant and useful; natural anchor text; no forced mentions, quotas, repetitive promotion, or automatic link stuffing.
- Verified facts vs uncertain/time-sensitive claims. Avoid unverified metrics and obsolete pricing.
- Writing preferences and claims to avoid.
- Human-editable Markdown; no embedding store, memory service, or automatic memory rewriting.

### Researched seed material (checked 2026-10-15)

Research began at `https://dhem.io` and `https://developer.dhem.io`, then followed the portfolio's product links. Both portfolio URLs yielded the same readable about text. Owner statements in this plan govern the permanent-domain/DHEM-brand distinction.

#### Identity and positioning

**Murtaza Baanihali**, full-stack developer and founder. His portfolio says he builds web and mobile products, focusing on performance, accessibility, and a clean user experience. He works end-to-end: scoping, UX, implementation, testing, and launch. It describes a preference for pragmatic choices, thoughtful defaults, and maintainable code.

Sources:
- https://dhem.io
- https://developer.dhem.io
- Local corroboration: `components/about-section.tsx` and `components/hero-section.tsx`.

The owner directly states he is a solo founder with several products and is developing DHEM into a brand. Do not infer legal company status, revenue, customer counts, years of experience at a future date, or team size beyond what he supplied.

#### iReplyy

- Portfolio-linked URL: https://ireplyy.dhem.io/
- Portfolio explicitly identifies Murtaza as founder.
- Product page was reachable. It describes social-media comment/DM automation, AI-assisted replies, a unified inbox/live chat, contacts, and activity tracking.
- Safe concise description: a tool for automating social-media replies and managing conversations.
- Relevant topics: social automation, customer conversations, lead capture, creator/business workflows, AI-assisted replies, building SaaS integrations.
- Do not repeat landing-page customer counts, performance claims, platform coverage, competitor prices, or verification badges as independently verified facts. Recheck specific integrations and pricing when needed.

#### Dhesend

- Portfolio-linked URL: https://dhesend.vercel.app/
- Portfolio explicitly identifies Murtaza as founder.
- Product page was reachable. Headline: "By Developers For Developers"; describes email integration using SDKs and shows an email-send API example.
- Safe concise description: a developer-focused email-sending/API integration product.
- Relevant topics: transactional email, SDK design, developer experience, application notifications, SaaS infrastructure.
- Do not assume deliverability metrics, analytics features, pricing, or supported SDK languages beyond what is verified. Use the linked URL until an updated canonical product URL is confirmed.

#### Tajven

- Portfolio-linked URL: https://tajven.com/
- Portfolio explicitly identifies Murtaza as founder.
- Direct product fetch failed during this research. The portfolio establishes the name/link and founder association, but not enough reliable detail for a product description.
- Seed the context with this limitation; do not invent its features or automatically promote it in a topical article without additional context.
- Search summaries suggested a possible DheGEN association, but that relationship was not verified. Do not seed it as fact.

#### Research limits and writing voice

The project listing at `https://developer.dhem.io/projects` was client-rendered and could not be read by the direct extractor. Search summaries mentioned additional projects, but unverified names/descriptions are intentionally not included in the seed catalog. Implementation may enrich the context from reachable official pages, but must not convert search summaries into asserted facts.

Suggested voice derived from owner preferences: practical founder/developer, clear and useful, specific when facts are available, readable rather than academic, restrained promotion. This is an editorial recommendation, not a quotation from the public site.

Refresh public links/details when creating the actual context file if practical. If a site is unavailable, retain the known linked URL and uncertainty note instead of blocking setup. No need to research private personal information.

## 9. Scope limits

Do not add in v1:

- Hosted generation/publishing endpoints, background autonomous repo scanning, cron/queue automation.
- CMS/database/user management or an author table.
- Full-text/vector/hosted search.
- Persistent published revision history or rollback UI.
- A full terminal text editor.
- Mandatory scholarly research verification or paid-search fallback.
- Automatic full-article illustration.
- Comments, newsletter infrastructure, sponsorship management, or unrelated portfolio redesigns.

Later: autonomous repository discovery/drafting using the same non-interactive core; richer search only if justified; sponsorship disclosures/blocks when needed. External agents authoring posts now is in scope even though automatic repository discovery is not.

## 10. Phased implementation plan

### Phase 1 — compatibility and contracts

Reinspect repository and current docs. Define frontmatter/manifests, environment examples, Worker binding setup, R2 staging/commit/cache semantics, and local tool layout. Test viable free-search paths and provider/image API handling with mocks where possible. Create the populated `tools/blog/blog-context.md` and its safe example. Add no secrets and do not edit `.env`.

### Phase 2 — read-only blog

Implement server-rendered listing/articles, taxonomy, metadata search, article styling, metadata/JSON-LD, raw Markdown, index, llms.txt, RSS, and sitemap integration. Use fixtures/local bindings first. Preserve policy/project/contact behavior.

### Phase 3 — publishing core and external agents

Implement R2 reads/uploads, validation, single/batch input, actual diffs, no-side-effect dry-runs, conflict detection, staged publication, explicit removals, and safe local/remote cleanup. Provide machine-readable CLI behavior and agent documentation.

### Phase 4 — TUI and built-in AI

Implement polished review/approval/editor workflow, drafting from briefs/context/sources, best-effort free research and fallbacks, OpenRouter text/image models and fallbacks, cover generation/reuse, and bounded/resumable batch operations.

### Phase 5 — verification and launch preparation

Run lint/type/build checks and focused automated tests. Exercise OpenNext Worker preview, not just Next dev. Document provisioning/deployment commands; do not silently provision resources, publish live articles, or incur paid API usage. Report any checks blocked by missing credentials or environment.

## 11. Acceptance checklist

- Existing home, projects, policies, contact flow, theme, navigation, and images still work.
- HTML source includes complete article text and correct per-post metadata without requiring browser JavaScript.
- No hardcoded portfolio/CDN URLs in application logic; URLs derive from validated configuration.
- Drafts stay out of published outputs despite explicitly public R2 storage.
- All required discovery endpoints agree on published state and use valid content types/escaping/absolute links.
- Article dates and stable slugs survive edits; missing content and upstream errors are distinguished.
- Metadata search and category/tag browsing work accessibly on mobile and desktop.
- Publishing does not rebuild the site; normal freshness stays within the five-minute target.
- Failed uploads do not expose a half-published batch; conflicts cannot silently erase remote changes.
- Dry-run makes no remote changes or destructive local cleanup; missing local files cause no inferred deletions.
- Successful publication cleans owned local generated content, while failed work, original inputs, configuration, and context survive.
- No historical revision feature; temporary cleanup respects cached readers and shared assets.
- Beautiful TUI preview/diff/approval and external editor work; non-interactive commands never unexpectedly prompt.
- External agents can import and publish single/batch Markdown without using OpenRouter generation.
- Ordered text/image model fallbacks are bounded; successful outputs are not regenerated unnecessarily.
- Search retries/fallbacks are bounded and free; total research failure still produces a usable draft with a non-blocking warning.
- No fake citations/current-price verification or forced product backlinks.
- `tools/blog/blog-context.md` exists, is populated with sourced public identity/product details, is loaded reliably, and is never deleted by publication cleanup.
- No `.env` modifications, tracked secrets, accidental private-source uploads, or AI SDK/tooling leakage into the Worker bundle.
- Worker-preview verification and any unavailable live integration checks are reported honestly.

## Reference documentation

Recheck current versions rather than treating summaries from the design session as API specifications:

- https://opennext.js.org/cloudflare
- https://opennext.js.org/cloudflare/bindings
- https://developers.cloudflare.com/r2/buckets/public-buckets/
- https://openrouter.ai/docs/features/multimodal/image-generation

Implementation success means a small, reliable blog and local publishing workflow—not a generalized CMS, agent platform, or research system.
