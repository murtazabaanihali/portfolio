import { readFile } from "node:fs/promises";
import { z } from "zod";
import { categories, siteUrl } from "../../lib/blog/config";
import { markdownTree, walk } from "../../lib/blog/contract";
import { briefSchema, generate, structuredCompletion } from "./ai";
import { articleCatalog, searchArticles, summarize, type ArticleCatalog, type ArticleSummary } from "./catalog";
import { BlogService } from "./core";
import { R2Storage } from "./storage";
import { CONTEXT_PATH, loadWorkspace, setStatus } from "./workspace";

// Suggestions require no paid call. The model proposes specific article angles within the selected directions.
export const directions = [
  { id: "email-apis", label: "Email APIs & developer experience", detail: "Transactional email, API/SDK design, and relevant Dhesend use cases" },
  { id: "social-workflows", label: "Social conversations & automation", detail: "Useful reply workflows, integration boundaries, and relevant iReplyy use cases" },
  { id: "ai-agents", label: "Practical AI & agent engineering", detail: "Tool boundaries, evaluation, reliability, and honest limitations" },
  { id: "solo-founder", label: "Building products under DHEM", detail: "Scoping, shipping, maintainable SaaS, and solo-founder decisions without invented stories" },
  { id: "full-stack", label: "Full-stack architecture & performance", detail: "Concrete engineering explanations, cloud trade-offs, and debugging" },
  { id: "accessible-ux", label: "Thoughtful UX & accessibility", detail: "Usable interfaces, implementation patterns, and accessibility trade-offs" },
] as const;
export const autonomousSchema = z.object({
  directions: z.array(z.enum(directions.map(d => d.id))).min(1).max(directions.length).transform(v => [...new Set(v)]),
  count: z.number().int().min(1).max(10),
  mode: z.enum(["draft", "publish"]).default("draft"),
  allowExistingTopic: z.boolean().default(false),
}).strict();
export type AutonomousOptions = z.input<typeof autonomousSchema>;
const reviewSchema = z.object({ acceptable: z.boolean(), reasons: z.array(z.string()).max(20) }).strict();

export function invalidInternalLinks(body: string, posts: ArticleSummary[]) {
  const allowed = new Set(posts.filter(p => p.url).map(p => new URL(p.url!).pathname.replace(/\/$/, "")));
  const invalid: string[] = [];
  walk(markdownTree(body), node => {
    if (!("url" in node) || node.type === "image") return;
    const url = new URL(node.url, siteUrl());
    if (url.origin === new URL(siteUrl()).origin && url.pathname.startsWith("/blog/") && !allowed.has(url.pathname.replace(/\/$/, ""))) invalid.push(node.url);
  });
  return invalid;
}

export async function runAutonomous(input: AutonomousOptions, onStatus: (message: string) => void = () => {}, deps: {
  catalog?: ArticleCatalog; service?: BlogService; generate?: typeof generate; complete?: typeof structuredCompletion;
} = {}) {
  const options = autonomousSchema.parse(input);
  const catalog = deps.catalog || articleCatalog();
  const complete = deps.complete || structuredCompletion, create = deps.generate || generate;
  // Autonomous operation fails closed on DB outages, unlike manual draft generation.
  const existing = await catalog.all(true);
  const context = await readFile(CONTEXT_PATH, "utf8");
  onStatus("Planning distinct article angles (paid text call)…");
  const planned = await complete(
    `You are the editorial planner for Murtaza's portfolio and DHEM umbrella brand. Plan exactly the requested number of useful articles across the selected directions. Prioritize reader questions and original, specific angles rather than generic SEO filler. Avoid covered search intents unless allowExistingTopic is true; even then require a distinct angle and a NEW slug. Do not invent personal stories or unsupported product facts. Do not assign sources or URLs: the writing stage uses maintained context. Return {"briefs": [...]} where each brief has slug, brief (detailed reader question, search intent, unique angle, useful examples, limitations), category, tags, coverAlt. Categories: ${categories.map(c => c.slug).join(", ")}.`,
    { count: options.count, selectedDirections: directions.filter(d => options.directions.includes(d.id)), allowExistingTopic: options.allowExistingTopic, editorialContext: context,
      // Bound prompt size; per-article search still checks the entire catalog, not this sample.
      existingCoverage: existing.slice(0, 200), totalExistingArticles: existing.length },
    z.object({ briefs: z.array(briefSchema.omit({ sources: true, urls: true, research: true, allowExistingTopic: true })).length(options.count) }).strict(),
  );
  const results: { slug: string; id?: string; status: string; reasons?: string[]; result?: unknown }[] = [];
  const reserved = [...existing];
  for (const [index, plannedBrief] of planned.briefs.entries()) {
    const brief = briefSchema.parse({ ...plannedBrief, allowExistingTopic: options.allowExistingTopic });
    onStatus(`${index + 1}/${options.count}: ${brief.slug}`);
    const matches = searchArticles(reserved, { slug: brief.slug, topic: brief.brief, tags: brief.tags, category: brief.category });
    if (reserved.some(p => p.slug === brief.slug) || (!options.allowExistingTopic && matches.some(p => p.covered))) {
      results.push({ slug: brief.slug, status: "skipped-covered", reasons: matches.filter(p => p.covered).map(p => p.title) });
      continue;
    }
    // Reserve intent even if generation fails: do not pay for overlapping plans twice in one run.
    reserved.push({ slug: brief.slug, title: brief.slug.replaceAll("-", " "), description: brief.brief, category: brief.category, tags: brief.tags, status: "draft" });
    let id: string | undefined;
    let stagedFingerprint: string | undefined;
    try {
      const generated = await create(brief, undefined, reserved.filter(p => p.slug !== brief.slug));
      id = generated.id;
      const w = await loadWorkspace(id);
      if (w.meta.slug !== brief.slug) throw new Error("Generated workspace does not match the planned slug");
      reserved[reserved.findIndex(p => p.slug === brief.slug)] = summarize(w.meta, id);
      if (w.state.baselineRevision || w.meta.status !== "draft") throw new Error("Autonomy only accepts new local drafts, never remote revisions");
      if (generated.partial || w.state.warnings?.length) {
        results.push({ slug: brief.slug, id, status: "held-draft", reasons: [generated.partial ? "Generation incomplete; retry cover" : "Source/coverage warnings require review", ...(w.state.warnings || [])] });
        continue;
      }
      if (options.mode === "draft") { results.push({ slug: brief.slug, id, status: "draft" }); continue; }
      const review = await complete(
        "Review this draft against supplied editorial facts. Reject unsupported personal/product claims, fabricated evidence, generic filler, misleading citations, or unexplained duplication of existing coverage. Return {acceptable: boolean, reasons: string[]}. This is an advisory model review, not independent fact verification.",
        { article: w.raw, editorialContext: context, relatedCoverage: matches.slice(0, 6), brief }, reviewSchema,
      );
      if (!review.acceptable) { results.push({ slug: brief.slug, id, status: "held-draft", reasons: review.reasons }); continue; }
      // Fresh optimistic check before planning; the existing core then enforces head ETag CAS under its lock.
      const fresh = await catalog.all(true);
      const conflicts = searchArticles(fresh.filter(p => p.workspace !== id), { slug: brief.slug, topic: w.meta.title, tags: brief.tags, category: brief.category });
      if (fresh.some(p => p.slug === brief.slug && p.workspace !== id) || (!options.allowExistingTopic && conflicts.some(p => p.covered))) throw new Error("Coverage changed; review existing topic before publishing");
      const badLinks = invalidInternalLinks(w.body, fresh);
      if (badLinks.length) throw new Error(`Unknown internal article links: ${badLinks.join(", ")}`);
      if ((await loadWorkspace(id)).fingerprint !== w.fingerprint) throw new Error("Draft changed during review");
      await setStatus(id, "published");
      stagedFingerprint = (await loadWorkspace(id)).fingerprint;
      // Only publication accesses R2. Draft generation and coverage need DB + local work only.
      const service = deps.service || new BlogService(new R2Storage());
      const plan = await service.plan([{ type: "upsert", workspace: id }]);
      if (plan.changes.some(c => c.kind !== "new")) throw new Error("Autonomy never overwrites existing posts");
      if (plan.changes.some(c => c.fingerprint !== stagedFingerprint)) throw new Error("Draft changed after review; inspect it before publishing");
      const committed = await service.commit(plan, true);
      catalog.invalidate();
      reserved[reserved.findIndex(p => p.slug === brief.slug)] = summarize({ ...w.meta, status: "published" });
      results.push({ slug: brief.slug, id, status: "published", result: committed });
    } catch (error) {
      // Never retry an uncertain publication automatically. Keep local work for inspection.
      if (id && stagedFingerprint) {
        try {
          // Revert only our own unchanged local status transition, never an operator's concurrent edits.
          if ((await loadWorkspace(id)).fingerprint === stagedFingerprint) await setStatus(id, "draft");
        } catch { /* Successful commit may already have cleaned it. */ }
      }
      results.push({ slug: brief.slug, id, status: id ? "held-draft" : "failed", reasons: [String(error)] });
    }
  }
  return { requested: options.count, mode: options.mode, results };
}
