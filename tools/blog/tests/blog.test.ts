import { afterEach, describe, expect, test } from "bun:test";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BlogService } from "../core";
import { bytes, text, Conflict, type Storage, type Stored } from "../storage";
import { approve, cleanup, createWorkspace, loadWorkspace, hash, imageType } from "../workspace";
import { articleInfo, parsePost, serializePost, jsonLd, manifestSchema, type Post } from "../../../lib/blog/contract";
import { HEAD_KEY, GRACE_MS, siteUrl } from "../../../lib/blog/config";
import { publishedIndex, rss } from "../../../lib/blog/discovery";
import { research, publicFetch } from "../research";
import { fallback, localSource, generate, revise, type Brief } from "../ai";

process.env.NEXT_PUBLIC_APP_URL = "https://portfolio.example.com";
process.env.BLOG_CDN_URL = "https://content.example.com";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY9sAAAAASUVORK5CYII=", "base64");
const meta = (slug = "test-post", status: Post["status"] = "published"): Post => ({
  version: 1, title: "A useful technical article", slug, description: "A useful description of technical publishing decisions and their practical trade-offs.",
  author: "Murtaza Baanihali", status, category: "ai-agents", tags: ["ai", "engineering"],
  publishedAt: status === "published" ? "2024-01-01T12:00:00Z" : null,
  updatedAt: status === "published" ? "2024-01-01T12:00:00Z" : null,
  cover: { src: "https://content.example.com/external-cover.png", alt: "A paper task card inside a clear boundary" },
});
const body = "An answer-first introduction with enough substance for an article.\n\n## Useful heading\n\nA practical explanation with **emphasis**.\n\n## Useful heading\n\nMore useful text.";
const ids: string[] = [];
async function workspace(m = meta(), cover?: Uint8Array) {
  const id = await createWorkspace(serializePost(m, body), cover);
  ids.push(id); return id;
}
afterEach(async () => { for (const id of ids.splice(0)) try { await cleanup(id); } catch { /* committed work was cleaned */ } });
class MemoryStore implements Storage {
  objects = new Map<string, Stored & { modified: number }>();
  mutations: string[] = []; failKey?: string; uncertainHead = false;
  async get(key: string) { return this.objects.get(key) || null; }
  async put(key: string, data: Uint8Array, _type: string, condition?: { match?: string; absent?: boolean }) {
    if (this.failKey && key.includes(this.failKey)) throw new Error("Simulated upload failure");
    const before = this.objects.get(key);
    if (condition?.absent && before || condition?.match && before?.etag !== condition.match) throw new Conflict("ETag conflict");
    this.mutations.push("put:" + key);
    this.objects.set(key, { bytes: data, etag: '"' + hash(data) + '"', modified: Date.now() });
    if (key === HEAD_KEY && this.uncertainHead) { this.uncertainHead = false; throw new Error("Timeout after committed write"); }
  }
  async remove(key: string) { this.mutations.push("delete:" + key); this.objects.delete(key); }
  async list(prefix: string) { return [...this.objects].filter(([k]) => k.startsWith(prefix)).map(([key, v]) => ({ key, modified: v.modified })); }
}
async function setup() { const storage = new MemoryStore(), service = new BlogService(storage); await service.initialize(); storage.mutations = []; return { storage, service }; }

describe("content and discovery", () => {
  test("normalizes tags, keeps dates, rejects HTML/unsafe URLs/aliases", () => {
    const raw = serializePost({ ...meta(), tags: ["AI Agents", "ai-agents", "React"] }, body);
    expect(parsePost(raw).meta.tags).toEqual(["ai-agents", "react"]);
    expect(parsePost(raw).meta.publishedAt).toBe("2024-01-01T12:00:00Z");
    expect(() => parsePost(raw + "\n<script>alert(1)</script>")).toThrow("HTML");
    expect(() => parsePost(raw + "\n[bad](javascript:alert)")).toThrow("Unsafe");
    expect(() => parsePost(raw + "\n![missing alt](https://example.com/a.png)\n![](https://example.com/b.png)")).toThrow("alt");
    expect(() => parsePost(raw.replace("version: 1", "version: &x 1\nextra: *x"))).toThrow();
  });
  test("TOC anchors match duplicate heading slug behavior", () => {
    expect(articleInfo(body).toc.map(h => h.id)).toEqual(["useful-heading", "useful-heading-1"]);
  });
  test("escapes JSON-LD and XML and uses configured canonical origins", async () => {
    expect(jsonLd({ title: "</script>" })).not.toContain("<");
    const { service } = await setup(), id = await workspace({ ...meta(), title: 'A title with & <angle> "quotes"' });
    await service.commit(await service.plan([{ type: "upsert", workspace: id }]), true);
    const { manifest } = await service.snapshot();
    expect(rss(manifest.posts)).toContain("&amp; &lt;angle&gt;");
    expect(publishedIndex(manifest.posts).posts[0].markdown).toBe("https://portfolio.example.com/blog/test-post/raw.md");
    expect(siteUrl("/blog")).toBe("https://portfolio.example.com/blog");
  });
  test("drafts cannot enter public manifests", () => {
    expect(() => manifestSchema.parse({ version: 1, posts: [{ meta: meta("draft-post", "draft"), key: "blog/objects/test/post.md", revision: "a".repeat(64), assets: [] }] })).toThrow("draft");
  });
  test("stored date parsing is deterministic; future publishing blocked in planner", async () => {
    const future = { ...meta(), publishedAt: "2099-01-01T00:00:00Z", updatedAt: "2099-01-01T00:00:00Z" };
    expect(parsePost(serializePost(future, body)).meta.publishedAt).toStartWith("2099");
    const id = await workspace(future), { service } = await setup();
    await expect(service.plan([{ type: "upsert", workspace: id }])).rejects.toThrow("Future");
  });
});

describe("publishing safety", () => {
  test("missing head requires explicit initialization", async () => {
    await expect(new BlogService(new MemoryStore()).snapshot()).rejects.toThrow("Active head missing");
  });
  test("plan/dry-run is read-only and includes actual text/cover diffs", async () => {
    const { storage, service } = await setup(), id = await workspace(meta(), png);
    const plan = await service.plan([{ type: "upsert", workspace: id }]);
    expect(storage.mutations).toEqual([]);
    expect(plan.changes[0].diff).toContain("+An answer-first");
    expect(plan.changes[0].cover.after).toContain(hash(png));
    expect((await loadWorkspace(id)).cover).toBeDefined();
  });
  test("failed upload never activates partial batch or cleans local work", async () => {
    const { storage, service } = await setup(), a = await workspace(meta("first-post")), b = await workspace(meta("second-post"));
    const before = text((await storage.get(HEAD_KEY))!);
    storage.failKey = "second-post.md";
    await expect(service.commit(await service.plan([{ type: "upsert", workspace: a }, { type: "upsert", workspace: b }]), true)).rejects.toThrow("Simulated");
    expect(text((await storage.get(HEAD_KEY))!)).toBe(before);
    expect((await loadWorkspace(a)).id).toBe(a); expect((await loadWorkspace(b)).id).toBe(b);
  });
  test("approval is exact; edits invalidate it and stale plans", async () => {
    const { service } = await setup(), id = await workspace();
    await expect(service.commit(await service.plan([{ type: "upsert", workspace: id }]))).rejects.toThrow("Approval");
    await approve(id);
    const plan = await service.plan([{ type: "upsert", workspace: id }]), w = await loadWorkspace(id);
    await writeFile(join(w.path, "post.md"), w.raw + "\nA later unapproved change.\n");
    await expect(service.commit(plan)).rejects.toThrow("changed");
    await expect(service.commit(await service.plan([{ type: "upsert", workspace: id }]))).rejects.toThrow("Approval");
  });
  test("content/cover changes invalidate approval", async () => {
    const id = await workspace(meta(), png); await approve(id);
    const w = await loadWorkspace(id);
    await writeFile(join(w.path, w.meta.cover.src), Buffer.concat([png, Buffer.from([0])]));
    expect((await loadWorkspace(id)).fingerprint).not.toBe(w.state.approval);
  });
  test("concurrent plans reject stale baseline; missing local posts never delete others", async () => {
    const { service } = await setup(), a = await workspace(meta("first-post")), b = await workspace(meta("second-post"));
    const stale = await service.plan([{ type: "upsert", workspace: b }]);
    await service.commit(await service.plan([{ type: "upsert", workspace: a }]), true);
    await expect(service.commit(stale, true)).rejects.toThrow("changed");
    await service.commit(await service.plan([{ type: "upsert", workspace: b }]), true);
    expect((await service.snapshot()).manifest.posts.length).toBe(2);
  });
  test("successful commit cleans owned work and uncertain write is reconciled", async () => {
    const { service, storage } = await setup(), id = await workspace();
    storage.uncertainHead = true;
    const result = await service.commit(await service.plan([{ type: "upsert", workspace: id }]), true);
    expect(result.committed).toBe(true);
    await expect(loadWorkspace(id)).rejects.toThrow();
    expect((await service.snapshot()).manifest.posts.length).toBe(1);
  });
  test("editing preserves original publication date and rejects changed slug", async () => {
    const { service } = await setup(), id = await workspace();
    await service.commit(await service.plan([{ type: "upsert", workspace: id }]), true);
    const fetched = await service.fetch("test-post"); ids.push(fetched);
    const w = await loadWorkspace(fetched);
    await writeFile(join(w.path, "post.md"), serializePost({ ...w.meta, publishedAt: "2024-01-02T00:00:00Z", updatedAt: "2024-01-02T00:00:00Z" }, w.body));
    await expect(service.plan([{ type: "upsert", workspace: fetched }])).rejects.toThrow("publishedAt");
    await writeFile(join(w.path, "post.md"), serializePost({ ...w.meta, slug: "renamed-post" }, w.body));
    await expect(loadWorkspace(fetched)).rejects.toThrow("Slug changed");
  });
  test("unpublish excludes discovery but retains editable draft, delete is explicit", async () => {
    const { service } = await setup(), id = await workspace();
    await service.commit(await service.plan([{ type: "upsert", workspace: id }]), true);
    await service.commit(await service.plan([{ type: "unpublish", slug: "test-post" }]), true);
    expect((await service.snapshot()).manifest.posts).toHaveLength(0);
    expect((await service.snapshot()).inventory.posts[0].meta.status).toBe("draft");
    expect(publishedIndex((await service.snapshot()).manifest.posts).posts).toHaveLength(0);
    await service.commit(await service.plan([{ type: "delete", slug: "test-post" }]), true);
    expect((await service.snapshot()).inventory.posts).toHaveLength(0);
  });
  test("GC retains retired objects during grace and shared assets referenced by drafts", async () => {
    const { service, storage } = await setup(), id = await workspace(meta(), png);
    await service.commit(await service.plan([{ type: "upsert", workspace: id }]), true);
    const state = await service.snapshot(), old = state.inventory.posts[0], cover = old.meta.cover.src;
    const draft = await workspace({ ...meta("shared-draft", "draft"), cover: { ...old.meta.cover } });
    await service.commit(await service.plan([{ type: "upsert", workspace: draft }]), true);
    await service.commit(await service.plan([{ type: "delete", slug: "test-post" }]), true);
    for (const object of storage.objects.values()) object.modified = 0;
    const young = await service.gc(true);
    expect(young.keys).not.toContain(old.key); expect(young.keys).not.toContain(cover);
    const current = await service.snapshot();
    const updated = { ...current.inventory, retired: current.inventory.retired.map(r => ({ ...r, at: new Date(Date.now() - GRACE_MS - 1000).toISOString() })) };
    await storage.put(current.head!.inventory, bytes(JSON.stringify(updated)), "application/json");
    const oldCandidates = await service.gc(true);
    expect(oldCandidates.keys).toContain(old.key); expect(oldCandidates.keys).not.toContain(cover);
    await service.gc(false); expect(await storage.get(cover)).not.toBeNull(); expect(await storage.get(old.key)).toBeNull();
  });
  test("GC and publishers cannot pass an active lock", async () => {
    const { service, storage } = await setup(), id = await workspace();
    await storage.put("blog/publishing.lock", bytes('{"owner":"another-writer"}'), "application/json");
    await expect(service.commit(await service.plan([{ type: "upsert", workspace: id }]), true)).rejects.toThrow("conflict");
    await expect(service.gc(false)).rejects.toThrow("conflict");
  });
  test("context persists after cleanup; original source not tool-owned", async () => {
    const { CONTEXT_PATH } = await import("../workspace");
    const before = await readFile(CONTEXT_PATH, "utf8");
    const id = await workspace(); await cleanup(id);
    expect(await readFile(CONTEXT_PATH, "utf8")).toBe(before);
  });
});

describe("generation/research boundaries (no paid calls)", () => {
  test("ordered provider fallback is bounded", async () => {
    const calls: string[] = [];
    const result = await fallback(["broken", "working"], async model => { calls.push(model); if (model === "broken") throw new Error("transient"); return "ok"; });
    expect(calls).toEqual(["broken", "broken", "working"]); expect(result.model).toBe("working");
  });
  test("all free research failures are nonblocking and use independent fallbacks", async () => {
    const calls: string[] = [];
    const result = await research("fresh model information", ["one", "two"].map(name => ({
      name, async search() { calls.push(name); throw new Error("restricted"); },
    })), 1200);
    expect(calls).toContain("one"); expect(calls).toContain("two");
    expect(result.sources).toEqual([]); expect(result.warnings.join(" ")).toContain("Continue drafting");
  });
  test("text/image generation is resumable and revision retains cover while invalidating approval", async () => {
    const originalFetch = globalThis.fetch;
    const keys = ["OPENROUTER_API_KEY", "BLOG_TEXT_MODELS", "BLOG_IMAGE_MODELS", "BLOG_AI_BASE_URL"];
    const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    Object.assign(process.env, { OPENROUTER_API_KEY: "test-key-not-real", BLOG_TEXT_MODELS: "text-model", BLOG_IMAGE_MODELS: "image-model", BLOG_AI_BASE_URL: "https://provider.example.test/v1" });
    let textCalls = 0, imageCalls = 0, imageWorks = false;
    globalThis.fetch = (async (url: string | URL | Request) => {
      const value = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      if (value.endsWith("/chat/completions")) {
        textCalls++;
        return Response.json({ id: "mock", choices: [{ message: { role: "assistant", content: serializePost(meta("generated-post", "draft"), body) }, finish_reason: "stop" }] });
      }
      if (value.endsWith("/images")) {
        imageCalls++;
        return imageWorks ? Response.json({ data: [{ b64_json: png.toString("base64"), media_type: "image/png" }] }) : new Response("temporary", { status: 503 });
      }
      throw new Error("Unexpected network request in mock: " + value);
    }) as typeof fetch;
    try {
      const brief: Brief = { slug: "generated-post", brief: "Explain practical agent approval boundaries using hypothetical examples.", category: "ai-agents", tags: ["ai"], sources: [], urls: [], research: false, coverAlt: "A paper task inside a clear boundary" };
      const first = await generate(brief); ids.push(first.id);
      expect("partial" in first && first.partial).toBe(true);
      expect(textCalls).toBe(1); expect(imageCalls).toBe(2);
      imageWorks = true;
      const second = await generate(brief);
      expect(second.id).toBe(first.id); expect(textCalls).toBe(1); expect(imageCalls).toBe(3);
      const third = await generate(brief);
      expect(third.id).toBe(first.id); expect(imageCalls).toBe(3);
      await approve(first.id);
      const before = await loadWorkspace(first.id);
      await revise(first.id, "Clarify the boundaries");
      const after = await loadWorkspace(first.id);
      expect(after.meta.cover).toEqual(before.meta.cover);
      expect(after.meta.slug).toBe(before.meta.slug);
      expect(after.state.approval).toBeUndefined();
      expect(after.state.textModel).toBe("text-model");
    } finally {
      globalThis.fetch = originalFetch;
      for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
    }
  });
  test("private URLs and credential files are refused", async () => {
    await expect(publicFetch("https://127.0.0.1/private", AbortSignal.timeout(100))).rejects.toThrow("Private");
    await expect(publicFetch("http://example.com", AbortSignal.timeout(100))).rejects.toThrow("HTTPS");
    const dir = await mkdtemp(join(tmpdir(), "blog-secret-test-"));
    try {
      await writeFile(join(dir, ".npmrc"), "//registry.example/:_authToken=private-secret");
      await writeFile(join(dir, ".envrc"), "export SOMETHING=private-secret");
      await expect(localSource(join(dir, ".npmrc"))).rejects.toThrow("secret");
      await expect(localSource(join(dir, ".envrc"))).rejects.toThrow("secret");
      await writeFile(join(dir, "notes.txt"), "api_key = abcdefghijklmnopqrstuvwxyz");
      await expect(localSource(join(dir, "notes.txt"))).rejects.toThrow("credentials");
    } finally { await rm(dir, { recursive: true }); }
    expect(() => imageType(Buffer.from("<svg/>"))).toThrow("Invalid");
  });
  test("CLI rejects destructive dry-run combinations before action", async () => {
    const command = Bun.spawn(["bun", "tools/blog/cli.ts", "clean", "invalid", "--yes", "--dry-run"], { stdout: "pipe", stderr: "pipe" });
    expect(await command.exited).toBe(2);
    expect(await new Response(command.stderr).text()).toContain("no action taken");
  });
});
