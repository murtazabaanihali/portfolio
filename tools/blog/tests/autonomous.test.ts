import { afterEach, describe, expect, test } from "bun:test";
import { ArticleCatalog, searchArticles, summarize, type ArticleSummary } from "../catalog";
import { autonomousSchema, invalidInternalLinks, runAutonomous } from "../autonomous";
import { BlogService } from "../core";
import { type Storage, type Stored, Conflict } from "../storage";
import { cleanup, createWorkspace, hash, loadWorkspace } from "../workspace";
import { serializePost, type Post } from "../../../lib/blog/contract";
import { generate as generateArticle, type generate, type structuredCompletion } from "../ai";

process.env.NEXT_PUBLIC_APP_URL = "https://portfolio.example.com";
process.env.BLOG_CDN_URL = "https://content.example.com";
class Memory implements Storage {
  data = new Map<string, Stored>(); gets: string[] = [];
  async get(key: string) { this.gets.push(key); return this.data.get(key) || null; }
  async put(key: string, bytes: Uint8Array, _type: string, condition?: { match?: string; absent?: boolean }) {
    if ((condition?.absent && this.data.has(key)) || (condition?.match && this.data.get(key)?.etag !== condition.match)) throw new Conflict("conflict");
    this.data.set(key, { bytes, etag: hash(bytes) });
  }
  async remove(key: string) { this.data.delete(key); }
  async list(prefix: string) { return [...this.data.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key, modified: Date.now() })); }
}
const post = (slug = "transactional-email-retries"): Post => ({ version: 1, slug, title: "Transactional email retries", description: "Handle transactional email retries with bounded backoff and clear failure handling.", author: "Murtaza Baanihali", category: "engineering", tags: ["email", "retries"], status: "draft", publishedAt: null, updatedAt: null, cover: { src: "https://content.example.com/cover.png", alt: "An envelope beside a retry timer" } });
const ids: string[] = [];
afterEach(async () => { for (const id of ids.splice(0)) try { await cleanup(id); } catch {} });
async function setup() { const storage = new Memory(), service = new BlogService(storage); await service.initialize(); return { storage, service, catalog: new ArticleCatalog(async () => []) }; }
const brief = { slug: "transactional-email-retries", brief: "Explain bounded transactional email retries and their failure modes for API developers.", category: "engineering", tags: ["email", "retries"], coverAlt: "An envelope beside a retry timer" };
function completion(acceptable = true): typeof structuredCompletion {
  return (async (_instruction: string, input: unknown, schema: { parse: (v: unknown) => unknown }) => schema.parse((input as { count?: number }).count ? { briefs: [brief] } : { acceptable, reasons: acceptable ? [] : ["Unsupported claim"] })) as typeof structuredCompletion;
}
function generator(warnings: string[] = []): typeof generate {
  return (async () => {
    const id = await createWorkspace(serializePost(post(), "## Retry deliberately\n\nUse bounded retries with backoff and an idempotency key. This is a hypothetical implementation example, not a product claim."), undefined, ".png", { warnings });
    ids.push(id); return { id, warnings, textModel: "mock", cover: { id, reused: false, model: "mock" } };
  }) as typeof generate;
}

describe("catalog coverage", () => {
  test("coalesces DB queries, honors TTL, refreshes and invalidates", async () => {
    let clock = 1000, queries = 0;
    const catalog = new ArticleCatalog(async () => { queries++; return []; }, 100, () => clock);
    await Promise.all([catalog.database(), catalog.database(), catalog.database()]);
    expect(queries).toBe(1);
    await catalog.database(); expect(queries).toBe(1);
    clock += 101; await catalog.database(); expect(queries).toBe(2);
    catalog.invalidate(); await catalog.database(); expect(queries).toBe(3);
    await catalog.database(true); expect(queries).toBe(4);
  });
  test("DB outages are not cached as empty success or replaced by R2 results", async () => {
    let unavailable = true;
    const catalog = new ArticleCatalog(async () => {
      if (unavailable) throw new Error("DB unavailable");
      return [summarize({ ...post(), status: "published" })];
    });
    await expect(catalog.database()).rejects.toThrow("DB unavailable");
    unavailable = false;
    expect(await catalog.database()).toHaveLength(1);
    unavailable = true;
    await expect(catalog.database(true)).rejects.toThrow("DB unavailable");
  });
  test("combines DB metadata and freshly rescanned local work without R2 reads", async () => {
    const { storage } = await setup(); storage.gets = [];
    const catalog = new ArticleCatalog(async () => [summarize({ ...post("db-only-article"), status: "published" })]);
    expect((await catalog.all()).some(p => p.slug === "db-only-article" && !!p.url)).toBe(true);
    const id = await createWorkspace(serializePost(post("local-only-article"), "Local draft with a useful explanation of bounded retries and failure handling.")); ids.push(id);
    const all = await catalog.all();
    expect(all.some(p => p.workspace === id && !p.url)).toBe(true);
    expect(storage.gets).toEqual([]);
  });
  test("same intent is flagged, shared category alone is not; drafts have no link", () => {
    const draft = summarize(post());
    const published = summarize({ ...post("email-idempotency"), title: "Email idempotency keys", status: "published" });
    const found = searchArticles([draft, published], { slug: "retries-transactional-email", topic: "Transactional email retries", tags: ["email"] });
    expect(found[0].covered).toBe(true); expect(found[0].url).toBeUndefined();
    expect(published.url).toContain("/blog/email-idempotency");
    expect(searchArticles([draft], { topic: "Accessible keyboard navigation", category: "engineering" })).toEqual([]);
  });
  test("generation blocks overlap before paid calls and override supplies published link context", async () => {
    const keys = ["OPENROUTER_API_KEY", "BLOG_TEXT_MODELS", "BLOG_IMAGE_MODELS", "BLOG_AI_BASE_URL"];
    const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    Object.assign(process.env, { OPENROUTER_API_KEY: "mock", BLOG_TEXT_MODELS: "mock-text", BLOG_IMAGE_MODELS: "mock-image", BLOG_AI_BASE_URL: "https://mock.example.com" });
    const originalFetch = globalThis.fetch;
    let calls = 0, prompt = "";
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls++;
      if (String(url).endsWith("/chat/completions")) {
        prompt = String(init?.body);
        return Response.json({ choices: [{ message: { content: serializePost(post(), "A distinct follow-up explaining email retries with concrete failure handling and bounded backoff.") } }] });
      }
      if (String(url).endsWith("/images")) return Response.json({ data: [{ b64_json: Buffer.from([137, 80, 78, 71]).toString("base64") }] });
      throw new Error("Unexpected network call");
    }) as typeof fetch;
    try {
      const existing = [summarize({ ...post(), status: "published" }), summarize(post("local-email-draft"), "local")];
      const followup = { ...brief, slug: "transactional-email-retries-guide" };
      await expect(generateArticle(followup, undefined, existing)).rejects.toThrow("Topic likely covered");
      expect(calls).toBe(0);
      await expect(generateArticle({ ...brief, allowExistingTopic: true }, undefined, existing)).rejects.toThrow("Slug already exists");
      const generated = await generateArticle({ ...followup, allowExistingTopic: true }, undefined, existing); ids.push(generated.id);
      expect(calls).toBe(2);
      const payload = JSON.parse(prompt);
      const content = JSON.parse(payload.messages[1].content);
      expect(content.relatedPublishedArticles).toHaveLength(1);
      expect(content.relatedPublishedArticles[0].url).toBe("https://portfolio.example.com/blog/transactional-email-retries");
      expect(content.continuingExistingTopic).toBe(true);
      expect(payload.messages[0].content).toContain("DHEM");
    } finally {
      globalThis.fetch = originalFetch;
      for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
    }
  });
  test("rejects invented internal links including reference definitions", () => {
    const posts: ArticleSummary[] = [summarize({ ...post(), status: "published" })];
    expect(invalidInternalLinks("[ok](/blog/transactional-email-retries#example)", posts)).toEqual([]);
    expect(invalidInternalLinks("[bad][x]\n\n[x]: /blog/imaginary", posts)).toEqual(["/blog/imaginary"]);
  });
});

describe("bounded autonomy", () => {
  test("validates count/directions and defaults to drafts", () => {
    expect(autonomousSchema.parse({ directions: ["email-apis"], count: 2 }).mode).toBe("draft");
    expect(() => autonomousSchema.parse({ directions: ["email-apis"], count: 11 })).toThrow();
    expect(() => autonomousSchema.parse({ directions: [], count: 1 })).toThrow();
  });
  test("draft mode creates local work without remote mutations", async () => {
    const deps = await setup(), before = [...deps.storage.data.keys()];
    const result = await runAutonomous({ directions: ["email-apis"], count: 1 }, undefined, { ...deps, generate: generator(), complete: completion() });
    expect(result.results[0].status).toBe("draft");
    expect([...deps.storage.data.keys()]).toEqual(before);
  });
  test("auto-accept publishes a reviewed new post", async () => {
    const deps = await setup();
    const result = await runAutonomous({ directions: ["email-apis"], count: 1, mode: "publish" }, undefined, { ...deps, generate: generator(), complete: completion() });
    expect(result.results[0].status).toBe("published");
    expect((await deps.service.snapshot()).manifest.posts[0].meta.slug).toBe(brief.slug);
  });
  test("review rejection and source warnings retain local drafts", async () => {
    for (const warnings of [[], ["Source unavailable"]]) {
      const deps = await setup();
      const result = await runAutonomous({ directions: ["email-apis"], count: 1, mode: "publish" }, undefined, { ...deps, generate: generator(warnings), complete: completion(false) });
      expect(result.results[0].status).toBe("held-draft");
      expect((await loadWorkspace(result.results[0].id!)).meta.status).toBe("draft");
      expect((await deps.service.snapshot()).manifest.posts).toEqual([]);
      await cleanup(ids.pop()!);
    }
  });
  test("failed live commit returns the runner's unchanged workspace to draft", async () => {
    const deps = await setup();
    class FailingService extends BlogService { async commit(): Promise<never> { throw new Error("Simulated conflict"); } }
    const result = await runAutonomous({ directions: ["email-apis"], count: 1, mode: "publish" }, undefined, { ...deps, service: new FailingService(deps.storage), generate: generator(), complete: completion() });
    expect(result.results[0].status).toBe("held-draft");
    expect((await loadWorkspace(result.results[0].id!)).meta.status).toBe("draft");
    expect((await deps.service.snapshot()).manifest.posts).toEqual([]);
  });
  test("repeated plans in one batch do not generate duplicate drafts", async () => {
    const deps = await setup();
    const complete = (async (_instruction: string, _input: unknown, schema: { parse: (v: unknown) => unknown }) => schema.parse({ briefs: [brief, brief] })) as typeof structuredCompletion;
    const result = await runAutonomous({ directions: ["email-apis"], count: 2, allowExistingTopic: true }, undefined, { ...deps, generate: generator(), complete });
    expect(result.results.map(r => r.status)).toEqual(["draft", "skipped-covered"]);
  });
  test("coverage override never permits an existing slug", async () => {
    const deps = await setup();
    const id = await createWorkspace(serializePost(post(), "A useful existing draft about transactional email retry boundaries.")); ids.push(id);
    const result = await runAutonomous({ directions: ["email-apis"], count: 1, allowExistingTopic: true }, undefined, { ...deps, generate: generator(), complete: completion() });
    expect(result.results[0].status).toBe("skipped-covered");
  });
});
