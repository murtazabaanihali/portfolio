# External blog agents

You may author Markdown without calling built-in AI. Read `tools/blog/blog-context.md` first (resolved relative to this directory; never delete or upload it). If absent, copy the tracked public example and tell the operator. Do not infer missing personal/product facts.

## Boundaries

- No migrations, schema generation, DB push, deployment, resource provisioning, paid generation, or remote publish unless the operator explicitly authorizes that operation.
- Draft storage on R2 is PUBLIC. Do not upload private sources, secrets, research bundles, or .env.
- Work outside this tool's .work directory for original inputs; import creates disposable copies. Publication cleans only owned copies.
- Use GFM + strict YAML frontmatter, never HTML/MDX. See examples/post.md and lib/blog/contract.ts.
- Stable slugs; one configured category; normalized tags; descriptive cover alt. Dates are ISO-8601 with explicit timezone.
- Preserve original publishedAt on edits. Set updatedAt to the actual correction time. No scheduled future publication.
- Links must be useful and factual; no fabricated tests/experience/benchmarks or forced product promotion.

## Noninteractive workflow

Run commands from the repo root using Bun (or use an absolute CLI path from another directory with environment exported):
1. `bun run blog import /absolute/article.md --cover /absolute/cover.png`
2. Save returned workspace ID. `bun run blog validate ID`.
3. For first publication: `bun run blog status ID published` (sets publication timestamps).
4. `bun run blog plan ID --out /tmp/reviewed-blog-plan.json` and inspect real text + cover diff.
5. With human approval: `bun run blog approve ID`, then `bun run blog publish --plan /tmp/reviewed-blog-plan.json`.
6. An operator-authorized automation may use `--yes` instead of a local approval record. Never interpret authoring permission as publishing permission.
7. Read `cleanupWarnings` separately from `committed`. Do not republish just because cleanup failed.

Editing remote posts: `fetch SLUG` returns an owned workspace bound to its remote revision. Edit post.md via the returned workspace location or known tools/blog/.work/ID, preserve slug/publication time, then review again.

Batch JSON: `{"version":1,"actions":[{"type":"upsert","workspace":"UUID"}]}`.
Pass to `plan --batch file.json`; commit the saved plan. Removals must be explicit `unpublish` or `delete` actions; absence of local files means nothing.

Dry-run: `publish --batch file.json --dry-run` reads/validates/diffs only. It does not generate, upload, clean, or delete. Exit 3 means conflict: fetch/review/replan; do not force overwrite.

Built-in generation is optional and separate: `generate brief.json --yes` incurs provider charges and transmits selected material. It never publishes. Failed covers preserve generated text and return a retry ID.
