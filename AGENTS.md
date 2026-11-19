# Murtaza Baanihali Portfolio — Agent Instructions

Next.js 16 (App Router, React 19, TypeScript) personal portfolio + blog, deployed to Cloudflare Workers via OpenNext with R2-backed blog content and Neon PostgreSQL.

## Commands

Run from the repository root.

- Install: `bun install`
- Develop: `bun run dev` (requires `.env`; see `.env.example`)
- Build (Next): `bun run build`
- Lint: `bun run lint` (does not cover `tools/**`)
- Blog tool tests: `bun run blog:test`
- Blog tool typecheck: `bun run blog:typecheck`
- Cloudflare preview: `bun run preview` (OpenNext build + wrangler preview)
- Deploy: `bun run deploy` — deployment is an operator-authorized action, not part of normal changes
- Database: `bun run db:studio`; `bun run db:update` (drizzle-kit generate + migrate — requires `DATABASE_URL` and operator authorization)
- Cloudflare env types: `bun run cf:typegen` (generates `cloudflare-env.d.ts`, gitignored)

## Project Map

- `app/` — App Router pages/layouts (portfolio, `/blog`, policies, sitemap, robots). Blog routes use `force-dynamic` and `no-store` on purpose.
- `actions/index.ts` — `"use server"` actions (contact email, cached project queries).
- `components/` — portfolio sections + shadcn/ui primitives (`components/ui/`, configured in `components.json`).
- `lib/blog/` — shared blog contract used by both the site and `tools/blog` (categories, frontmatter schemas, R2 object layout).
- `lib/db/` — Drizzle schema and queries (Neon serverless driver). `blog_posts` is a metadata mirror for coverage/related lookup only; content serving and publishing stay R2-backed.
- `drizzle/` — generated SQL migrations; do not hand-edit.
- `tools/blog/` — local-only Bun authoring/publishing CLI for agents; excluded from app typecheck/lint and the Worker build (`next.config.mjs`).
- `.env` / `.dev.vars` — local secrets, never committed or uploaded.

## Working Agreements

- Use `bun`/`bunx` for JavaScript/TypeScript; never `npm`/`npx`.
- Create a new branch for project changes; do not commit directly to the default branch.
- `@/*` maps to the repo root (e.g. `@/lib`, `@/components`).
- Adding blog categories: edit the `categories` list in `lib/blog/config.ts`; the DB enum in `lib/db/blog-schema.ts` must stay in sync via a migration.
- Code style is prettier-like (4-space indent in portfolio code, 2-space in `lib/blog`); match the surrounding file.
- All blog content changes go through the `bun run blog publish` workflow in `tools/blog/AGENTS.md` — never write directly to R2 or the `blog_posts` table.
- The blog DB mirror is kept synchronized automatically by `bun run blog publish`.
- No `Cache Everything`/edge TTL overrides for `/blog*`, `/llms.txt`, or `/sitemap.xml`; blog reader freshness relies on existing cache-control semantics.
- Local R2 S3 credentials belong only in local `.env`/`.dev.vars` — never in Wrangler bindings or tracked files.

## Definition of Done

- For app/code changes: run `bun run lint` and `bun run build`; for `tools/blog` changes also run `bun run blog:test` and `bun run blog:typecheck`. State any checks not run.
- For blog posts only: no build/test/typecheck — follow the review/publish flow in `tools/blog/AGENTS.md`.
- Never run migrations, deploys, or paid generation without explicit operator authorization.
- Don't edit generated artifacts (`drizzle/`, `.next/`, `.open-next/`, `.wrangler/`) by hand.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
