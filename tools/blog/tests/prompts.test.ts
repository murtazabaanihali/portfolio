import { afterEach, describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { categories } from "../../../lib/blog/config";
import { parsePost, serializePost, type Post } from "../../../lib/blog/contract";
import { briefSchema, generate, revise, writingTokenLimit, type Brief } from "../ai";
import { researchDeps, pages, scriptedTurn, toolMessage, dossier, fixtureSearch, fixtureRead } from "./research-fixture";
import { BLOG_PROMPT_VERSION, blogWriterSystem, directionSystem, plannerSystem, needsCurrentSources } from "../prompts";
import { cleanup, createWorkspace, hash, loadWorkspace, CONTEXT_PATH } from "../workspace";

const ids: string[] = [];
afterEach(async () => { for (const id of ids.splice(0)) await cleanup(id); });
const brief: Brief = {
  slug: "marketing-without-a-playbook", category: "marketing-growth", tags: ["marketing", "builders"],
  brief: "Write a conversational guide to marketing for developers: explain how to find the first interested people without turning it into a worksheet.",
  postType: "guide", coverAlt: "A handwritten message reaching a small group of people",
};
function post(input: Brief): Post {
  return {
    version: 1, title: "Start with a conversation, not a marketing playbook", slug: input.slug,
    description: "A grounded blog post about finding the first people who care about what you are building.",
    author: "Murtaza Baanihali", category: input.category, tags: input.tags || [], status: "draft",
    publishedAt: null, updatedAt: null, cover: { src: "https://example.invalid/pending-cover.png", alt: input.coverAlt },
  };
}
const body = "Your first marketing problem probably isn't reach. It's finding a few people who already care about the problem you are solving.\n\nStart with the places where those people describe their frustrations in their own words. A useful conversation there can tell you more than a week of broadcasting a feature list.";
type Payload = { model: string; messages: { role: string; content: string; tool_call_id?: string }[]; max_tokens?: number; tools?: unknown[]; tool_choice?: string };
async function withProvider(input: Brief, run: (requests: Payload[]) => Promise<void>, finishReason = "stop") {
  const originalFetch = globalThis.fetch;
  const keys = ["OPENROUTER_API_KEY", "BLOG_TEXT_MODELS", "BLOG_IMAGE_MODELS", "BLOG_AI_BASE_URL", "BLOG_RESEARCH_MODELS", "BLOG_WRITING_MAX_TOKENS"];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { OPENROUTER_API_KEY: "mock", BLOG_TEXT_MODELS: "router-request", BLOG_IMAGE_MODELS: "mock-image", BLOG_AI_BASE_URL: "https://provider.example.test/v1", BLOG_RESEARCH_MODELS: "router-research", BLOG_WRITING_MAX_TOKENS: "24000" });
  const requests: Payload[] = [];
  const researchResponse = scriptedTurn();
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).endsWith("/chat/completions")) {
      const payload = JSON.parse(String(init?.body)) as Payload;
      requests.push(payload);
      if (payload.tools) return Response.json({ model: "actual-research-model", choices: [{ message: (await researchResponse([])).message, finish_reason: "tool_calls" }] });
      return Response.json({ model: "actual-writing-model", choices: [{ message: { content: serializePost(post(input), body) }, finish_reason: finishReason }] });
    }
    if (String(url).endsWith("/images")) return Response.json({ data: [{ b64_json: Buffer.from([137, 80, 78, 71]).toString("base64") }] });
    throw new Error("Unexpected network call: " + url);
  }) as typeof fetch;
  try { await run(requests); }
  finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
  }
}

describe("broad blog writing, not technical worksheets", () => {
  test("new categories work through the actual post contract and old categories remain valid", () => {
    for (const category of categories) {
      expect(parsePost(serializePost({ ...post(brief), category: category.slug }, body), true).meta.category).toBe(category.slug);
    }
    for (const category of ["ai-news", "marketing-growth", "business-ecommerce", "technology", "perspectives", "engineering", "ai-agents"]) {
      expect(categories.some(c => c.slug === category)).toBe(true);
    }
    expect(briefSchema.parse({ ...brief, postType: undefined }).postType).toBe("auto");
    expect(() => briefSchema.parse({ ...brief, researchQuery: "x".repeat(301) })).toThrow();
  });

  test("suggestion, planning and writing prompts share broad scope without a rigid article template", () => {
    for (const prompt of [directionSystem, plannerSystem, blogWriterSystem]) {
      expect(prompt).toContain("marketing");
      expect(prompt).toContain("ecommerce");
      expect(prompt).toContain("NOT limits");
      expect(prompt).toContain("not a requirement to turn every topic into a software tutorial");
    }
    expect(blogWriterSystem).toContain("You are the writer, not a planner");
    expect(blogWriterSystem).toContain("connected paragraphs");
    expect(blogWriterSystem).toContain("A draft means a complete post");
    expect(blogWriterSystem).toContain("not a formal research report");
    expect(blogWriterSystem.toLowerCase()).toContain("not a verified fact");
    expect(plannerSystem).toContain("researchQuery");
  });

  test("identifies time-sensitive topics for stronger freshness instructions",  () => {
    expect(needsCurrentSources({ ...brief, brief: "New Kimi 3.1 model is coming", postType: "auto" })).toBe(true);
    expect(needsCurrentSources({ ...brief, brief: "Reality about dropshipping 2026", postType: "guide" })).toBe(true);
    expect(needsCurrentSources({ ...brief, postType: "news" })).toBe(true);
    expect(needsCurrentSources({ ...brief, researchQuery: "Gemini model announcement capabilities" })).toBe(true);
    expect(needsCurrentSources(brief)).toBe(false);
  });

  test("feeds an explicit writing task, original topic and style to one writer; records real model and brief", async () => {
    await withProvider(brief, async requests => {
      const requestedDirections = ["A marketing guide for builder developers, conversational rather than academic"];
      const generated = await generate(brief, undefined, [], { requestedDirections, ...researchDeps() });
      ids.push(generated.id);
      expect(requests).toHaveLength(1); // No added reviewer or rewrite pass.
      expect(requests[0].max_tokens).toBe(24000);
      expect(requests[0].messages[0]).toEqual({ role: "system", content: blogWriterSystem });
      const input = JSON.parse(requests[0].messages[1].content);
      expect(input.task).toContain("Write the complete blog post now");
      expect(input.topicBrief).toBe(brief.brief);
      expect(input.requestedDirections).toEqual(requestedDirections);
      expect(input.postType).toBe("guide");
      expect(input.currentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(input.researchContext.attempted).toBe(true);
      expect(input.researchContext.complete).toBe(true);
      expect(input.writerPersona).toContain("API reliability");
      expect(input.primaryKeyword).toBe("bounded email retries");
      expect(input.coverAlt).toBe(brief.coverAlt);
      const w = await loadWorkspace(generated.id);
      expect(w.state.textModel).toBe("actual-writing-model");
      expect(w.state.requestedTextModel).toBe("router-request");
      const diagnostic = JSON.parse(await readFile(join(w.path, "generation.json"), "utf8"));
      expect(diagnostic.promptVersion).toBe(BLOG_PROMPT_VERSION);
      expect(diagnostic.brief.brief).toBe(brief.brief);
      expect(diagnostic.requestedDirections).toEqual(requestedDirections);
      expect(diagnostic).not.toHaveProperty("editorialContext");
    });
  });

  test("reuses drafts only with matching prompt version, brief and context",  async () => {
    const input: Brief = { ...brief, slug: "legacy-default-style", category: "ai-agents", postType: undefined };
    const normalized = briefSchema.parse(input);
    const legacy = { promptVersion: BLOG_PROMPT_VERSION, contextHash: hash(await readFile(CONTEXT_PATH, "utf8")), brief: normalized };
    const id = await createWorkspace(serializePost(post(input), body), Buffer.from([137, 80, 78, 71]), ".png", { generationKey: hash(JSON.stringify(legacy)) });
    ids.push(id);
    await withProvider(input, async requests => {
      const result = await generate(input, undefined, []);
      expect(result.id).toBe(id);
      expect("reused" in result && result.reused).toBe(true);
      expect(requests).toHaveLength(0);
    });
  });

  test("news passes real source material, snippet labels, date and warnings into the writer", async () => {
    const news: Brief = { ...brief, slug: "a-model-launch-explained", category: "ai-news", postType: "news", brief: "Write a grounded blog post about a proposed new model launch, distinguishing confirmed details from speculation.", researchQuery: "model launch official announcement" };
    await withProvider(news, async requests => {
      const queries: string[] = [];
      const sources = pages;
      const generated = await generate(news, undefined, [], { ...researchDeps(), research: async query => { queries.push(query); return { sources, warnings: [] }; } });
      ids.push(generated.id);
      expect(queries).toHaveLength(3); // LLM-issued queries, not a slug or the planner's one query.
      expect(requests).toHaveLength(1);
      const input = JSON.parse(requests[0].messages[1].content);
      expect(input.researchContext.attempted).toBe(true);
      expect(input.untrustedSelectedSources.sources).toEqual(sources);
      expect(input.researchDossier.findings).toHaveLength(3);
      expect((await loadWorkspace(generated.id)).state.sources).toContain(sources[0].url);
    });
  });

  test("time-sensitive drafts remain writable when research fails, with visible uncertainty", async () => {
    const dated: Brief = { ...brief, slug: "dropshipping-reality-2026", category: "business-ecommerce", brief: "Reality about dropshipping 2026: write a candid blog post about the economics, without inventing market statistics." };
    await withProvider(dated, async requests => {
      const queries: string[] = [];
      let turn = 0;
      const generated = await generate(dated, undefined, [], {
        researchTurn: async () => turn++ === 0
          ? toolMessage([{ name: "search_web", args: { query: "dropshipping margins current primary data" } }])
          : toolMessage([{ name: "finish_research", args: { ...dossier, sufficient: false, findings: [], gaps: ["No sources available"] } }]),
        research: async query => { queries.push(query); return { sources: [], warnings: [] }; },
      });
      ids.push(generated.id);
      expect(queries).toEqual(["dropshipping margins current primary data"]);
      expect(requests).toHaveLength(1);
      const input = JSON.parse(requests[0].messages[1].content);
      expect(input.nonBlockingWarnings.join(" ")).toContain("Research incomplete");
      expect((await loadWorkspace(generated.id)).meta.status).toBe("draft");
    });
  });

  test("real SDK adapter exchanges function calls/results before invoking the writer", async () => {
    await withProvider(brief, async requests => {
      const generated = await generate(brief, undefined, [], { research: fixtureSearch, suppliedSource: fixtureRead });
      ids.push(generated.id);
      expect(requests).toHaveLength(5);
      for (const request of requests.slice(0, 4)) {
        expect(request.tools).toHaveLength(3);
        expect(request.tool_choice).toBe("required");
        expect(request.model).toBe("router-research");
      }
      expect(requests[1].messages.filter(m => m.role === "tool")).toHaveLength(3);
      expect(requests[4].tools).toBeUndefined();
      expect(requests[4].max_tokens).toBe(24000);
      const w = await loadWorkspace(generated.id);
      const evidence = JSON.parse(await readFile(join(w.path, "research.json"), "utf8"));
      expect(evidence.complete).toBe(true);
      expect(evidence.models).toEqual(["actual-research-model"]);
    });
  });

  test("revision researches again, saves evidence, preserves slug and invalidates approval", async () => {
    const id = await createWorkspace(serializePost(post(brief), body), undefined, ".png", { approval: "old-approval" });
    ids.push(id);
    await withProvider(brief, async requests => {
      await revise(id, "Correct stale claims and clarify the supported example", researchDeps());
      const w = await loadWorkspace(id);
      expect(w.meta.slug).toBe(brief.slug);
      expect(w.state.approval).toBeUndefined();
      expect(w.state.sources).toContain(pages[0].url);
      const input = JSON.parse(requests[0].messages[1].content);
      expect(input.researchContext.complete).toBe(true);
      expect(JSON.parse(await readFile(join(w.path, "research.json"), "utf8")).queries).toHaveLength(3);
    });
  });

  test("writer token cap is configurable above 24k and rejects invalid values", () => {
    const old = process.env.BLOG_WRITING_MAX_TOKENS;
    try {
      process.env.BLOG_WRITING_MAX_TOKENS = "32768";
      expect(writingTokenLimit()).toBe(32768);
      process.env.BLOG_WRITING_MAX_TOKENS = "NaN";
      expect(() => writingTokenLimit()).toThrow();
    } finally { if (old === undefined) delete process.env.BLOG_WRITING_MAX_TOKENS; else process.env.BLOG_WRITING_MAX_TOKENS = old; }
  });

  test("does not accept truncated prose merely because its Markdown parses", async () => {
    await withProvider(brief, async requests => {
      await expect(generate(brief, undefined, [], researchDeps())).rejects.toThrow("truncated");
      expect(requests).toHaveLength(2); // Existing bounded provider retry, not an editorial reviewer.
    }, "length");
  });
});
