#!/usr/bin/env bun
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { BlogService, batchSchema, type Action, type Plan } from "./core";
import { R2Storage, Conflict } from "./storage";
import { approve, cleanup, importPost, listWorkspaces, loadWorkspace, setStatus } from "./workspace";
import { generate, generateBatch, generateCover, revise } from "./ai";
import { runAutonomous } from "./autonomous";
import { articleCatalog, searchArticles } from "./catalog";

const help = `Local blog workflow (never runs in the Worker)
bun run blog <command> [arguments] [options]

import <post.md> [--cover path]       Copy source into an owned workspace
import-batch <files.json>            JSON array of {file, cover?}
workspaces                          Local work/review status
validate <id>                       Validate one workspace
status <id> draft|published          Set editorial status; publication dates set explicitly
approve <id>                        Approve exact content + cover revision
plan <id...> [--batch actions.json]  Read-only diff (optionally --out plan.json)
publish <id...>                     Plan/commit; --yes is explicit noninteractive authorization
publish --plan plan.json           Commit only if plan, content, and remote baseline still match
                                   --dry-run never mutates or calls AI
unpublish <slug> / delete <slug>    Explicit removal; --dry-run or --yes required
list / fetch <slug>                 List remote editorial inventory / fetch for editing
init --yes                         Initialize empty remote manifests (one-time provisioning)
gc [--yes]                         List garbage; delete only with --yes and grace period
lock-status                        Inspect a stranded publishing lock
unlock <owner> --yes --no-active-writers  Manual recovery ONLY after stopping all writers
clean <id> --yes                    Explicitly discard owned local work
generate <brief.json> --yes [--allow-existing-topic]  Paid text + cover; array supports batches
autonomous <batch.json> --yes       Bounded batch; mode draft or publish (live requires --auto-publish)
related <query>                    Cached metadata search including local and remote coverage
cover <id> --yes [--regenerate]     Retry/reuse cover (regenerate only explicitly)
revise <id> --instructions "..." --yes
tui                                Keyboard review, diff, approval, editor, generation

All results are JSON. Plans contain text/frontmatter diffs and cover hashes.
Exit codes: 0 success; 1 operation failure/partial generation; 2 invalid input;
3 concurrent state/revision conflict; 4 missing explicit authorization.
See tools/blog/README.md and AGENTS.md. No implicit remote deletion.
`;
async function main() {
  const args = parseArgs({ args: process.argv.slice(2), allowPositionals: true, strict: true,
    options: { yes: { type: "boolean" }, "dry-run": { type: "boolean" }, cover: { type: "string" },
      batch: { type: "string" }, plan: { type: "string" }, out: { type: "string" },
      "allow-existing-topic": { type: "boolean" }, "auto-publish": { type: "boolean" },
      instructions: { type: "string" }, "no-active-writers": { type: "boolean" }, regenerate: { type: "boolean" }, help: { type: "boolean" } } });
  const [command, ...ids] = args.positionals, options = args.values;
  if (!command || options.help || command === "help") { console.log(help); return; }
  if (options["dry-run"] && !["plan", "publish", "unpublish", "delete", "gc"].includes(command)) {
    process.exitCode = 2; throw new Error("--dry-run is supported only for plan/publish/unpublish/delete/gc; no action taken");
  }
  const requireYes = () => { if (!options.yes) { process.exitCode = 4; throw new Error("Explicit --yes required; review first"); } };
  const required = (index = 0) => { if (!ids[index]) { process.exitCode = 2; throw new Error("Missing command argument"); } return ids[index]; };
  let result: unknown;
  const service = () => new BlogService(new R2Storage());
  switch (command) {
    case "import": result = { id: await importPost(required(), options.cover) }; break;
    case "import-batch": {
      const files: { file: string; cover?: string }[] = JSON.parse(await readFile(required(), "utf8"));
      if (!Array.isArray(files) || files.length > 100) throw new Error("Expected at most 100 file inputs");
      result = await Promise.all(files.map(async file => {
        try { return { file: file.file, id: await importPost(file.file, file.cover) }; }
        catch (e) { process.exitCode = 1; return { file: file.file, error: String(e) }; }
      })); break;
    }
    case "workspaces": result = await listWorkspaces(); break;
    case "validate": { const w = await loadWorkspace(required()); result = { id: w.id, meta: w.meta, fingerprint: w.fingerprint, approved: w.fingerprint === w.state.approval }; break; }
    case "status": {
      const status = required(1); if (status !== "draft" && status !== "published") throw new Error("Status must be draft or published");
      await setStatus(required(), status); result = { id: ids[0], status }; break;
    }
    case "approve": result = await approve(required()); break;
    case "clean": requireYes(); await cleanup(required()); result = { cleaned: ids[0] }; break;
    case "list": result = (await service().snapshot()).inventory.posts.map(e => ({ ...e.meta, revision: e.revision })); break;
    case "fetch": result = { id: await service().fetch(required()) }; break;
    case "init": requireYes(); result = await service().initialize(); break;
    case "lock-status": result = await service().lockStatus(); break;
    case "unlock": requireYes(); if (!options["no-active-writers"]) throw new Error("Stop ALL writers, verify lock owner, then pass --no-active-writers"); result = await service().recoverLock(required()); break;
    case "gc": result = await service().gc(!options.yes || !!options["dry-run"]); break;
    case "plan": case "publish": case "unpublish": case "delete": {
      const svc = service();
      const actions: Action[] = options.batch ? batchSchema.parse(JSON.parse(await readFile(options.batch, "utf8"))).actions :
        command === "unpublish" || command === "delete" ? [{ type: command, slug: required() }] :
        ids.map(workspace => ({ type: "upsert", workspace }));
      const saved: Plan | undefined = options.plan ? JSON.parse(await readFile(options.plan, "utf8")) : undefined;
      const fresh = await svc.plan(saved ? saved.changes.map(c => c.action) : actions);
      if (saved && saved.token !== fresh.token) throw new Conflict("Saved plan is stale; inspect a new plan before proceeding");
      // Commit the SAVED plan so its token binds the exact reviewed revision.
      const plan: Plan = saved ?? fresh;
      if (options.out) await writeFile(options.out, JSON.stringify(plan, null, 2));
      if (command === "plan" || options["dry-run"]) result = { ...plan, dryRun: true };
      else {
        // Explicit removal requires --yes; upserts can use revision-bound local approvals.
        if (plan.changes.some(c => c.kind === "delete" || c.kind === "unpublish")) requireYes();
        result = await svc.commit(plan, !!options.yes);
      }
      break;
    }
    case "related": result = searchArticles(await articleCatalog().all(), { topic: required() }); break;
    case "autonomous": {
      requireYes();
      const input = JSON.parse(await readFile(required(), "utf8"));
      if (options["allow-existing-topic"]) input.allowExistingTopic = true;
      if (input.mode === "publish" && !options["auto-publish"]) throw new Error("Live autonomy requires --auto-publish as well as --yes");
      result = await runAutonomous(input);
      if ((result as Awaited<ReturnType<typeof runAutonomous>>).results.some(r => ["failed", "held-draft"].includes(r.status))) process.exitCode = 1;
      break;
    }
    case "generate": {
      requireYes(); if (options["dry-run"]) throw new Error("Generation is separate from publishing dry-run");
      const input = JSON.parse(await readFile(required(), "utf8"));
      const withOverride = (brief: unknown) => options["allow-existing-topic"] ? { ...(brief as object), allowExistingTopic: true } : brief;
      result = Array.isArray(input) ? await generateBatch(input.map(withOverride)) : await generate(withOverride(input));
      if (JSON.stringify(result).includes('"error":')) process.exitCode = 1;
      break;
    }
    case "cover": requireYes(); result = await generateCover(required(), !!options.regenerate); break;
    case "revise": requireYes(); if (!options.instructions) throw new Error("Supply --instructions"); result = await revise(required(), options.instructions); break;
    case "tui": {
      if (!process.stdin.isTTY) throw new Error("TUI requires a terminal; use noninteractive commands instead");
      const { launchTui } = await import("./tui"); await launchTui(); return;
    }
    default: process.exitCode = 2; throw new Error("Unknown command. Use --help");
  }
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => {
  if (error instanceof Conflict) process.exitCode = 3;
  else if (!process.exitCode) process.exitCode = error?.name === "ZodError" || error?.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION" ? 2 : 1;
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error), exitCode: process.exitCode }));
});
