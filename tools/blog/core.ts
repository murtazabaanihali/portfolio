import { randomUUID } from "node:crypto";
import { createTwoFilesPatch } from "diff";
import { z } from "zod";
import { HEAD_KEY, OBJECT_PREFIX, GRACE_MS, cdnUrl } from "../../lib/blog/config";
import { headSchema, inventorySchema, manifestSchema, parsePost, serializePost, slugSchema, objectKey, type Entry, type Head, type Inventory, type Manifest } from "../../lib/blog/contract";
import { bytes, text, Conflict, type Storage } from "./storage";
import { loadWorkspace, cleanup, createWorkspace, hash } from "./workspace";

const LOCK_KEY = "blog/publishing.lock";
export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("upsert"), workspace: z.string().uuid() }).strict(),
  z.object({ type: z.enum(["unpublish", "delete"]), slug: slugSchema }).strict(),
]);
export const batchSchema = z.object({ version: z.literal(1), actions: z.array(actionSchema).min(1).max(100) }).strict();
export type Action = z.infer<typeof actionSchema>;
export type Change = { action: Action; slug: string; kind: "new" | "update" | "unpublish" | "delete"; fingerprint?: string; diff: string; cover: { before?: string; after?: string } };
export type Plan = { version: 1; baseline: string | null; changes: Change[]; token: string };
type Snapshot = { head: Head | null; etag: string | null; inventory: Inventory; manifest: Manifest };

function references(head: Head | null, inventory: Inventory) {
  const refs = new Set<string>(head ? [head.inventory, head.manifest] : []);
  for (const entry of inventory.posts) { refs.add(entry.key); for (const asset of entry.assets) refs.add(asset); }
  return refs;
}
function assetKeys(raw: string, cover: string) {
  const found = new Set<string>();
  if (objectKey.safeParse(cover).success) found.add(cover);
  // Scan serialized Markdown too, so reference-style images and links keep managed assets alive.
  const base = cdnUrl("");
  for (const match of raw.matchAll(/https:\/\/[^\s<>"')]+/g)) {
    if (match[0].startsWith(base)) {
      const key = decodeURIComponent(new URL(match[0]).pathname.slice(1));
      if (objectKey.safeParse(key).success) found.add(key);
    }
  }
  return [...found].sort();
}
export class BlogService {
  constructor(readonly storage: Storage) {}
  async snapshot(allowMissing = false): Promise<Snapshot> {
    const stored = await this.storage.get(HEAD_KEY);
    if (!stored && !allowMissing) throw new Error("Active head missing. Initialize a new bucket explicitly; investigate missing state on an existing bucket.");
    if (!stored) return { head: null, etag: null, inventory: { version: 1, posts: [], retired: [] }, manifest: { version: 1, posts: [] } };
    const head = headSchema.parse(JSON.parse(text(stored)));
    const [i, m] = await Promise.all([this.storage.get(head.inventory), this.storage.get(head.manifest)]);
    if (!i || !m) throw new Error("Remote head references missing objects; refusing to overwrite");
    const inventory = inventorySchema.parse(JSON.parse(text(i))), manifest = manifestSchema.parse(JSON.parse(text(m)));
    const expected = inventory.posts.filter(p => p.meta.status === "published");
    if (JSON.stringify(expected) !== JSON.stringify(manifest.posts) ||
        new Set(inventory.posts.map(p => p.meta.slug)).size !== inventory.posts.length)
      throw new Error("Remote inventory/manifest inconsistency");
    return { head, etag: stored.etag, inventory, manifest };
  }
  async plan(input: Action[]): Promise<Plan> {
    const actions = batchSchema.parse({ version: 1, actions: input }).actions;
    const snapshot = await this.snapshot(), changes: Change[] = [], slugs = new Set<string>();
    for (const action of actions) {
      const w = action.type === "upsert" ? await loadWorkspace(action.workspace) : undefined;
      const slug = w ? w.meta.slug : (action as { slug: string }).slug;
      if (slugs.has(slug)) throw new Error("A batch cannot target the same slug twice");
      slugs.add(slug);
      const before = snapshot.inventory.posts.find(p => p.meta.slug === slug);
      if (!w && !before) throw new Error(`No remote post: ${slug}`);
      if (w && before) {
        if (w.state.baselineRevision && w.state.baselineRevision !== before.revision) throw new Conflict(`${slug} changed remotely since it was fetched`);
        if (before.meta.publishedAt && w.meta.publishedAt !== before.meta.publishedAt) throw new Error("Original publishedAt must remain unchanged");
      }
      if (w && w.meta.cover.src.includes("example.invalid")) throw new Error("Generate or import a real cover before uploading this draft/post");
      if (w?.meta.status === "published") {
        if (Date.parse(w.meta.publishedAt!) > Date.now() || Date.parse(w.meta.updatedAt!) > Date.now()) throw new Error("Future publication is not supported; use draft");
        if (before && w.meta.updatedAt && before.meta.updatedAt && Date.parse(w.meta.updatedAt) < Date.parse(before.meta.updatedAt)) throw new Error("updatedAt cannot move backwards");
      }
      let previous = "";
      if (before) {
        const object = await this.storage.get(before.key);
        if (!object) throw new Error("Remote article missing");
        previous = text(object);
      }
      const after = w?.raw || (action.type === "unpublish" ? serializePost({ ...before!.meta, status: "draft" }, parsePost(previous).body) : "");
      if (w && before?.meta.status === "published" && w.meta.status === "published" && previous !== w.raw && w.meta.updatedAt === before.meta.updatedAt)
        throw new Error("Published corrections require a new updatedAt (publishedAt stays unchanged)");
      changes.push({
        action, slug, kind: action.type === "delete" ? "delete" : action.type === "unpublish" || (before?.meta.status === "published" && w?.meta.status === "draft") ? "unpublish" : before ? "update" : "new",
        fingerprint: w?.fingerprint,
        diff: createTwoFilesPatch(slug + "/before.md", slug + "/after.md", previous, after),
        cover: { before: before?.meta.cover.src, after: w ? w.meta.cover.src + (w.cover ? " (sha256 " + hash(w.cover) + ")" : "") : action.type === "delete" ? undefined : before?.meta.cover.src },
      });
    }
    const content = { version: 1 as const, baseline: snapshot.etag, changes };
    return { ...content, token: hash(JSON.stringify(content)) };
  }
  private lockWarnings: string[] = [];
  private async locked<T>(fn: (assertHeld: () => Promise<void>) => Promise<T>): Promise<T> {
    const owner = randomUUID();
    await this.storage.put(LOCK_KEY, bytes(JSON.stringify({ owner, startedAt: new Date().toISOString() })), "application/json", { absent: true });
    const assertHeld = async () => {
      const lock = await this.storage.get(LOCK_KEY);
      if (!lock || JSON.parse(text(lock)).owner !== owner) throw new Conflict("Publishing lock ownership lost; refusing mutation");
    };
    try { return await fn(assertHeld); }
    finally {
      try { await assertHeld(); await this.storage.remove(LOCK_KEY); }
      catch (error) {
        const warning = "Lock release failed; inspect lock-status before another mutation: " + String(error);
        this.lockWarnings.push(warning);
        console.error(JSON.stringify({ warning }));
      }
    }
  }
  async lockStatus() {
    const lock = await this.storage.get(LOCK_KEY);
    return lock ? JSON.parse(text(lock)) as { owner: string; startedAt: string } : null;
  }
  async recoverLock(owner: string) {
    const lock = await this.lockStatus();
    if (!lock || lock.owner !== owner) throw new Conflict("Lock owner differs; inspect lock-status again");
    // Operator must stop ALL writers/recovery commands first. Never auto-expire a lock.
    await this.storage.remove(LOCK_KEY);
    return { unlocked: owner };
  }
  private async verifiedPut(key: string, data: Uint8Array, type: string) {
    await this.storage.put(key, data, type, { absent: true });
    const check = await this.storage.get(key);
    if (!check || hash(check.bytes) !== hash(data)) throw new Error(`Upload verification failed: ${key}`);
  }
  async commit(plan: Plan, authorize = false) {
    if (!authorize && plan.changes.some(c => c.action.type !== "upsert")) throw new Error("Explicit authorization required for remote unpublish/delete actions");
    // Re-plan before lock and again inside it. Never trust caller-supplied diffs/fingerprints.
    const current = await this.plan(plan.changes.map(c => c.action));
    if (current.token !== plan.token) throw new Conflict("Plan or local content changed; inspect a fresh diff");
    const committed = await this.locked(async assertHeld => {
      const again = await this.plan(plan.changes.map(c => c.action));
      if (again.token !== plan.token) throw new Conflict("Remote or local state changed while acquiring lock");
      const baseline = await this.snapshot(), commit = randomUUID(), prefix = OBJECT_PREFIX + commit + "/";
      const posts = [...baseline.inventory.posts], owned: { id: string; fingerprint: string }[] = [];
      const mutations: { type: "upsert" | "unpublish" | "delete"; slug: string; entry?: Entry }[] = [];
      for (const change of plan.changes) {
        const previous = posts.find(e => e.meta.slug === change.slug);
        let next: Entry | undefined;
        if (change.action.type === "upsert") {
          const w = await loadWorkspace(change.action.workspace);
          if (w.fingerprint !== change.fingerprint) throw new Conflict("Local content changed during publication");
          if (!authorize && w.state.approval !== w.fingerprint) throw new Error(`Approval required for exact revision: ${w.id}`);
          const meta = { ...w.meta, cover: { ...w.meta.cover } };
          if (w.cover) {
            const { imageType } = await import("./workspace");
            const type = imageType(w.cover), ext = type === "image/jpeg" ? "jpg" : type.split("/")[1];
            meta.cover.src = prefix + change.slug + "-cover." + ext;
            await this.verifiedPut(meta.cover.src, w.cover, type);
          }
          const raw = serializePost(meta, w.body), key = prefix + change.slug + ".md";
          parsePost(raw);
          const assets = assetKeys(raw, meta.cover.src);
          for (const asset of assets) if (!await this.storage.get(asset)) throw new Error(`Referenced asset missing: ${asset}`);
          await this.verifiedPut(key, bytes(raw), "text/markdown; charset=utf-8");
          next = { meta, key, revision: hash(raw), assets };
          owned.push({ id: w.id, fingerprint: w.fingerprint });
          mutations.push({ type: "upsert", slug: change.slug, entry: next });
        } else if (change.action.type === "unpublish") {
          const prior = await this.storage.get(previous!.key);
          if (!prior) throw new Error("Article disappeared");
          const meta = { ...previous!.meta, status: "draft" as const };
          const raw = serializePost(meta, parsePost(text(prior)).body), key = prefix + change.slug + ".md";
          await this.verifiedPut(key, bytes(raw), "text/markdown; charset=utf-8");
          next = { ...previous!, meta, key, revision: hash(raw) };
          mutations.push({ type: "unpublish", slug: change.slug, entry: next });
        } else if (change.action.type === "delete") {
          mutations.push({ type: "delete", slug: change.slug });
        }
        const index = posts.findIndex(e => e.meta.slug === change.slug);
        if (index >= 0) posts.splice(index, 1);
        if (next) posts.push(next);
      }
      posts.sort((a, b) => a.meta.slug.localeCompare(b.meta.slug));
      const head: Head = { version: 1, commit, manifest: prefix + "manifest.json", inventory: prefix + "inventory.json" };
      const now = new Date().toISOString();
      const currentRefs = references(head, { version: 1, posts, retired: [] });
      const retired = new Map(baseline.inventory.retired.map(r => [r.key, r]));
      for (const key of references(baseline.head, baseline.inventory)) if (!currentRefs.has(key)) retired.set(key, { key, at: now });
      for (const key of currentRefs) retired.delete(key);
      const inventory = inventorySchema.parse({ version: 1, posts, retired: [...retired.values()] });
      const manifest = manifestSchema.parse({ version: 1, posts: posts.filter(p => p.meta.status === "published") });
      await this.verifiedPut(head.inventory, bytes(JSON.stringify(inventory)), "application/json");
      await this.verifiedPut(head.manifest, bytes(JSON.stringify(manifest)), "application/json");
      // Catch local edits that occurred during uploads, before any visible commit.
      for (const w of owned) if ((await loadWorkspace(w.id)).fingerprint !== w.fingerprint) throw new Conflict("Local revision changed during upload; no commit made");
      const payload = bytes(JSON.stringify(head));
      await assertHeld();
      try {
        await this.storage.put(HEAD_KEY, payload, "application/json", baseline.etag ? { match: baseline.etag } : { absent: true });
      } catch (error) {
        // A network timeout may occur after a successful commit. Resolve by reading our unique commit ID.
        const check = await this.storage.get(HEAD_KEY);
        if (!check || text(check) !== new TextDecoder().decode(payload)) throw error;
      }
      const check = await this.storage.get(HEAD_KEY);
      if (!check || text(check) !== new TextDecoder().decode(payload)) throw new Error("Commit verification uncertain; retain local work and inspect remote state");
      return { commit, owned, mutations };
    });
    const cleanupWarnings: string[] = this.lockWarnings.splice(0);
    if (process.env.DATABASE_URL) {
      try {
        const [{ default: db }, { blogPosts }, { eq }] = await Promise.all([
          import("../../lib/db"),
          import("../../lib/db/blog-schema"),
          import("drizzle-orm"),
        ]);
        for (const mut of committed.mutations) {
          if (mut.entry) {
            const { meta, key: contentKey, revision } = mut.entry;
            const values = {
              slug: meta.slug,
              title: meta.title,
              description: meta.description,
              author: meta.author,
              status: meta.status,
              category: meta.category as (typeof blogPosts.$inferInsert)["category"],
              tags: meta.tags,
              publishedAt: meta.publishedAt ? new Date(meta.publishedAt) : null,
              updatedAt: meta.updatedAt ? new Date(meta.updatedAt) : null,
              coverSrc: meta.cover.src,
              coverAlt: meta.cover.alt,
              contentKey,
              revision,
            };
            await db.insert(blogPosts).values(values).onConflictDoUpdate({
              target: blogPosts.slug,
              set: {
                title: values.title,
                description: values.description,
                author: values.author,
                status: values.status,
                category: values.category,
                tags: values.tags,
                publishedAt: values.publishedAt,
                updatedAt: values.updatedAt,
                coverSrc: values.coverSrc,
                coverAlt: values.coverAlt,
                contentKey: values.contentKey,
                revision: values.revision,
              },
            });
          } else if (mut.type === "delete") {
            await db.delete(blogPosts).where(eq(blogPosts.slug, mut.slug));
          }
        }
        try {
          const { articleCatalog } = await import("./catalog");
          articleCatalog().invalidate();
        } catch {}
      } catch (e) {
        cleanupWarnings.push(`Database mirror sync warning: ${String(e)}`);
      }
    }
    for (const w of committed.owned) {
      try {
        if ((await loadWorkspace(w.id)).fingerprint !== w.fingerprint) throw new Error("Workspace edited after commit; preserving it");
        await cleanup(w.id);
      } catch (e) { cleanupWarnings.push(`${w.id}: ${String(e)}`); }
    }
    return { committed: true, commit: committed.commit, cleanupWarnings };
  }
  async fetch(slug: string) {
    const { inventory } = await this.snapshot();
    const entry = inventory.posts.find(e => e.meta.slug === slugSchema.parse(slug));
    if (!entry) throw new Error("Post not found");
    const stored = await this.storage.get(entry.key);
    if (!stored) throw new Error("Article missing");
    return createWorkspace(text(stored), undefined, ".png", { baselineRevision: entry.revision });
  }
  async initialize() {
    return this.locked(async assertHeld => {
      const snapshot = await this.snapshot(true);
      if (snapshot.head) return { initialized: false, reason: "Already initialized" };
      const commit = randomUUID(), prefix = OBJECT_PREFIX + commit + "/";
      const head: Head = { version: 1, commit, manifest: prefix + "manifest.json", inventory: prefix + "inventory.json" };
      await this.verifiedPut(head.manifest, bytes(JSON.stringify(snapshot.manifest)), "application/json");
      await this.verifiedPut(head.inventory, bytes(JSON.stringify(snapshot.inventory)), "application/json");
      await assertHeld();
      await this.storage.put(HEAD_KEY, bytes(JSON.stringify(head)), "application/json", { absent: true });
      return { initialized: true };
    });
  }
  async gc(dryRun = true) {
    const run = async (assertHeld: () => Promise<void> = async () => {}) => {
      const state = await this.snapshot();
      if (!state.head) throw new Error("No active head; refusing GC");
      const live = references(state.head, state.inventory), now = Date.now();
      const retirement = new Map(state.inventory.retired.map(r => [r.key, Date.parse(r.at)]));
      const candidates = (await this.storage.list(OBJECT_PREFIX)).filter(o =>
        !live.has(o.key) && now - (retirement.get(o.key) ?? o.modified) > GRACE_MS);
      if (!dryRun) for (const object of candidates) { await assertHeld(); await this.storage.remove(object.key); }
      return { dryRun, keys: candidates.map(c => c.key) };
    };
    return dryRun ? run() : this.locked(run);
  }
}
