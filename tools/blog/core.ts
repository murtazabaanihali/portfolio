import { randomUUID } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve, extname, join } from "node:path";
import {
  MANIFEST_KEY,
  HEAD_KEY,
  LOCK_KEY,
  siteUrl,
  cdnUrl,
} from "../../lib/blog/config";
import {
  headSchema,
  manifestSchema,
  postSchema,
  normalizeTag,
  parsePost,
  serializePost,
  rewriteImageUrls,
  type Entry,
  type Manifest,
  type Post,
} from "../../lib/blog/contract";
import { bytes, text, Conflict, R2Storage, type Storage } from "./storage";
import {
  hash,
  imageType,
  readInlineImages,
  compressImage,
  type InlineImage,
  type CompressOptions,
} from "./images";

export type PublishResult = {
  success: true;
  slug: string;
  title: string;
  url: string;
  contentKey: string;
  cover: string;
  assets: string[];
};

export type BulkPublishItem = {
  file: string;
  cover?: string;
  compress?: boolean;
};

export type BulkPublishOptions = {
  compress?: boolean;
  maxWidth?: number;
  quality?: number;
};

export type BulkPublishResult = {
  total: number;
  published: number;
  failed: number;
  results: Array<
    | {
        file: string;
        slug: string;
        title: string;
        url: string;
        contentKey: string;
        cover: string;
        status: "ok";
      }
    | {
        file: string;
        status: "failed";
        error: string;
      }
  >;
};

export type UpdatePostItem = {
  slug: string;
  title?: string;
  description?: string;
  file?: string;
  cover?: string;
  coverAlt?: string;
  category?: string;
  tags?: string[] | string;
  author?: string;
  compress?: boolean;
};

export type UpdatePostOptions = {
  compress?: boolean;
  maxWidth?: number;
  quality?: number;
};

export type BulkUpdateResult = {
  total: number;
  updated: number;
  failed: number;
  results: Array<
    | {
        slug: string;
        title: string;
        url: string;
        contentKey: string;
        cover: string;
        status: "ok";
      }
    | {
        slug: string;
        status: "failed";
        error: string;
      }
  >;
};

export type UpdateResult = {
  success: true;
  slug: string;
  title: string;
  url: string;
  contentKey: string;
  cover: string;
  assets: string[];
};

/** Scan a directory for post.md files or article subdirectories. */
export async function findPostsInDir(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const posts: string[] = [];

  // 1. Direct post.md
  if (entries.some((e) => e.isFile() && e.name === "post.md")) {
    return [join(dir, "post.md")];
  }

  // 2. Subdirectories with post.md or *.md
  for (const e of entries) {
    if (e.isDirectory()) {
      const sub = join(dir, e.name);
      const subEntries: string[] = await readdir(sub).catch(() => []);
      if (subEntries.includes("post.md")) {
        posts.push(join(sub, "post.md"));
      } else {
        const md = subEntries.find(
          (f) => f.endsWith(".md") && !/^readme|agents|context/i.test(f),
        );
        if (md) posts.push(join(sub, md));
      }
    }
  }

  // 3. Fallback: *.md files in dir
  if (posts.length === 0) {
    for (const e of entries) {
      if (
        e.isFile() &&
        e.name.endsWith(".md") &&
        !/^readme|agents|context/i.test(e.name)
      ) {
        posts.push(join(dir, e.name));
      }
    }
  }

  return posts.sort();
}

/** Sync blog post metadata to Neon PostgreSQL database mirror if DATABASE_URL is set (skipped during test runs). */
export async function syncPostToDb(entry: Entry): Promise<void> {
  if (process.env.NODE_ENV === "test" || !process.env.DATABASE_URL) return;
  try {
    const { default: db } = await import("../../lib/db");
    const { blogPosts } = await import("../../lib/db/blog-schema");

    await db
      .insert(blogPosts)
      .values({
        slug: entry.meta.slug,
        title: entry.meta.title,
        description: entry.meta.description,
        author: entry.meta.author,
        status: entry.meta.status,
        category: entry.meta.category as any,
        tags: entry.meta.tags,
        publishedAt: entry.meta.publishedAt
          ? new Date(entry.meta.publishedAt)
          : null,
        updatedAt: entry.meta.updatedAt ? new Date(entry.meta.updatedAt) : null,
        coverSrc: entry.meta.cover.src,
        coverAlt: entry.meta.cover.alt,
        contentKey: entry.key,
        revision: entry.revision,
      })
      .onConflictDoUpdate({
        target: blogPosts.slug,
        set: {
          title: entry.meta.title,
          description: entry.meta.description,
          author: entry.meta.author,
          status: entry.meta.status,
          category: entry.meta.category as any,
          tags: entry.meta.tags,
          publishedAt: entry.meta.publishedAt
            ? new Date(entry.meta.publishedAt)
            : null,
          updatedAt: entry.meta.updatedAt
            ? new Date(entry.meta.updatedAt)
            : null,
          coverSrc: entry.meta.cover.src,
          coverAlt: entry.meta.cover.alt,
          contentKey: entry.key,
          revision: entry.revision,
        },
      });
  } catch (e) {
    console.warn(
      "DB mirror sync warning (content published to R2 successfully):",
      e instanceof Error ? e.message : String(e),
    );
  }
}

/** Update blog post status in DB mirror (skipped during test runs). */
export async function setDbPostStatus(
  slug: string,
  status: "draft" | "published",
): Promise<void> {
  if (process.env.NODE_ENV === "test" || !process.env.DATABASE_URL) return;
  try {
    const { default: db } = await import("../../lib/db");
    const { blogPosts } = await import("../../lib/db/blog-schema");
    const { eq } = await import("drizzle-orm");

    await db
      .update(blogPosts)
      .set({ status })
      .where(eq(blogPosts.slug, slug));
  } catch (e) {
    console.warn("DB mirror status update warning:", e instanceof Error ? e.message : String(e));
  }
}

/** Delete blog post row from DB mirror (skipped during test runs). */
export async function deleteDbPost(slug: string): Promise<void> {
  if (process.env.NODE_ENV === "test" || !process.env.DATABASE_URL) return;
  try {
    const { default: db } = await import("../../lib/db");
    const { blogPosts } = await import("../../lib/db/blog-schema");
    const { eq } = await import("drizzle-orm");

    await db.delete(blogPosts).where(eq(blogPosts.slug, slug));
  } catch (e) {
    console.warn("DB mirror delete warning:", e instanceof Error ? e.message : String(e));
  }
}

/** Service managing clean blog publishing, asset storage, and manifest updates. */
export class BlogService {
  constructor(readonly storage: Storage) {}

  /**
   * Fetch current published manifest.
   * If blog/manifest.json is absent, falls back to legacy blog/head.json if present.
   */
  async manifest(allowMissing = false): Promise<Manifest> {
    const direct = await this.storage.get(MANIFEST_KEY);
    if (direct) {
      return manifestSchema.parse(JSON.parse(text(direct)));
    }

    // Backward compatibility fallback to legacy head.json during migration
    const legacyHead = await this.storage.get(HEAD_KEY);
    if (legacyHead) {
      const head = headSchema.parse(JSON.parse(text(legacyHead)));
      const legacyManifest = await this.storage.get(head.manifest);
      if (legacyManifest) {
        return manifestSchema.parse(JSON.parse(text(legacyManifest)));
      }
    }

    if (allowMissing) {
      return { version: 1, posts: [] };
    }

    throw new Error(
      "Blog has not been initialized. Run 'bun run blog init --yes' first.",
    );
  }

  /** Acquire conditional publishing lock in R2. */
  async acquireLock(owner = randomUUID()): Promise<string> {
    try {
      await this.storage.put(
        LOCK_KEY,
        bytes(
          JSON.stringify({
            owner,
            acquiredAt: new Date().toISOString(),
          }),
        ),
        "application/json",
        { absent: true },
      );
      return owner;
    } catch {
      const existing = await this.lockStatus();
      throw new Conflict(
        `Publishing lock held by ${existing.owner || "unknown"} since ${existing.acquiredAt || "unknown"}. If stranded, run 'bun run blog unlock ${existing.owner || ""} --yes'.`,
      );
    }
  }

  /** Release publishing lock. */
  async releaseLock(owner?: string, force = false): Promise<void> {
    if (force || !owner) {
      await this.storage.remove(LOCK_KEY);
      return;
    }

    const current = await this.lockStatus();
    if (!current.locked) return;

    if (current.owner && current.owner !== owner) {
      console.warn("Lock owner mismatch during release; skipping remove");
      return;
    }

    await this.storage.remove(LOCK_KEY);
  }

  /** Inspect publishing lock status. */
  async lockStatus(): Promise<{
    locked: boolean;
    owner?: string;
    acquiredAt?: string;
  }> {
    const stored = await this.storage.get(LOCK_KEY);
    if (!stored) return { locked: false };
    try {
      const data = JSON.parse(text(stored));
      return { locked: true, owner: data.owner, acquiredAt: data.acquiredAt };
    } catch {
      return { locked: true };
    }
  }

  /**
   * Publish multiple blog posts in bulk.
   * Uploads all assets and updates blog/manifest.json under a single atomic lock.
   */
  async publishBulk(
    items: BulkPublishItem[],
    options?: BulkPublishOptions,
  ): Promise<BulkPublishResult> {
    if (!items.length) {
      return { total: 0, published: 0, failed: 0, results: [] };
    }

    type PreparedItem = {
      file: string;
      slug: string;
      title: string;
      url: string;
      contentKey: string;
      coverKey: string;
      coverBytes?: Uint8Array;
      coverMime?: string;
      inlineImages: Record<string, InlineImage>;
      meta: Post;
      finalMarkdown: string;
      assets: string[];
    };

    const prepared: PreparedItem[] = [];
    const results: BulkPublishResult["results"] = [];
    const existingManifest = await this.manifest(true);
    const now = new Date().toISOString();

    for (const item of items) {
      try {
        const raw = await readFile(item.file, "utf8");
        const parsed = parsePost(raw, true);
        const slug = parsed.meta.slug;
        const baseDir = dirname(item.file);
        const shouldCompress = item.compress ?? options?.compress ?? false;
        const compressOpts: CompressOptions | undefined = shouldCompress
          ? {
              maxWidth: options?.maxWidth,
              quality: options?.quality,
            }
          : undefined;

        const existingPost = existingManifest.posts.find(
          (p) => p.meta.slug === slug,
        );
        const publishedAt =
          existingPost?.meta.publishedAt || parsed.meta.publishedAt || now;
        const updatedAt = now;

        // Resolve cover image
        let coverPath = item.cover;
        if (!coverPath && parsed.meta.cover.src.startsWith("./")) {
          coverPath = resolve(baseDir, parsed.meta.cover.src);
        }

        let coverKey = parsed.meta.cover.src;
        let coverBytes: Uint8Array | undefined;
        let coverMime: string | undefined;

        if (coverPath) {
          const rawBytes = await readFile(coverPath);
          const rawMime = imageType(rawBytes);

          if (shouldCompress) {
            const compressed = await compressImage(rawBytes, compressOpts);
            coverBytes = compressed.bytes;
            coverMime = compressed.type;
            coverKey = `blog/posts/${slug}/cover${compressed.ext}`;
          } else {
            coverBytes = rawBytes;
            coverMime = rawMime;
            const ext =
              extname(coverPath).toLowerCase() ||
              (coverMime === "image/jpeg"
                ? ".jpg"
                : "." + coverMime.split("/")[1]);
            coverKey = `blog/posts/${slug}/cover${ext}`;
          }
        } else if (
          !coverKey.startsWith("https://") &&
          !coverKey.startsWith("blog/posts/")
        ) {
          throw new Error(
            `Cover image required for "${slug}". Provide --cover <path> or frontmatter cover.src: ./cover.png, or an HTTPS URL.`,
          );
        }

        // Resolve inline images
        const inlineImages = await readInlineImages(baseDir, parsed.body);
        const urlMap = new Map<string, string>();
        const inlineAssets: string[] = [];
        const finalInlineImages: Record<string, InlineImage> = {};

        for (const [src, img] of Object.entries(inlineImages)) {
          if (shouldCompress) {
            const compressed = await compressImage(img.bytes, compressOpts);
            const baseFilename = img.filename.replace(/\.[^.]+$/, "");
            const newFilename = `${baseFilename}${compressed.ext}`;
            const assetKey = `blog/posts/${slug}/images/${newFilename}`;
            urlMap.set(src, cdnUrl(assetKey));
            inlineAssets.push(assetKey);
            finalInlineImages[src] = {
              bytes: compressed.bytes,
              type: compressed.type,
              filename: newFilename,
            };
          } else {
            const assetKey = `blog/posts/${slug}/images/${img.filename}`;
            urlMap.set(src, cdnUrl(assetKey));
            inlineAssets.push(assetKey);
            finalInlineImages[src] = img;
          }
        }

        const rewrittenBody = rewriteImageUrls(parsed.body, urlMap);
        const meta: Post = {
          ...parsed.meta,
          status: "published",
          publishedAt,
          updatedAt,
          cover: {
            src: coverKey,
            alt: parsed.meta.cover.alt,
          },
        };

        const finalMarkdown = serializePost(meta, rewrittenBody);
        const contentKey = `blog/posts/${slug}/post.md`;
        const assets = [
          ...(coverBytes ? [coverKey] : []),
          ...inlineAssets,
        ];

        prepared.push({
          file: item.file,
          slug,
          title: meta.title,
          url: siteUrl(`/blog/${slug}`),
          contentKey,
          coverKey,
          coverBytes,
          coverMime,
          inlineImages: finalInlineImages,
          meta,
          finalMarkdown,
          assets,
        });
      } catch (err) {
        results.push({
          file: item.file,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (prepared.length === 0) {
      return {
        total: items.length,
        published: 0,
        failed: results.length,
        results,
      };
    }

    // Acquire lock once for the entire bulk upload
    const lockOwner = await this.acquireLock();
    try {
      const manifest = await this.manifest(true);
      const manifestPostsMap = new Map<string, Entry>(
        manifest.posts.map((p) => [p.meta.slug, p]),
      );

      for (const prep of prepared) {
        try {
          // 1. Upload cover if local
          if (prep.coverBytes && prep.coverMime) {
            await this.storage.put(
              prep.coverKey,
              prep.coverBytes,
              prep.coverMime,
            );
          }

          // 2. Upload inline images
          for (const img of Object.values(prep.inlineImages)) {
            const key = `blog/posts/${prep.slug}/images/${img.filename}`;
            await this.storage.put(key, img.bytes, img.type);
          }

          // 3. Upload markdown post
          await this.storage.put(
            prep.contentKey,
            bytes(prep.finalMarkdown),
            "text/markdown; charset=utf-8",
          );

          const entry: Entry = {
            meta: prep.meta,
            key: prep.contentKey as `blog/posts/${string}/post.md`,
            revision: hash(prep.finalMarkdown),
            assets: prep.assets as any,
          };

          // 4. Update manifest map
          manifestPostsMap.set(prep.slug, entry);

          // 5. Update DB mirror
          await syncPostToDb(entry);

          results.push({
            file: prep.file,
            slug: prep.slug,
            title: prep.title,
            url: prep.url,
            contentKey: prep.contentKey,
            cover: prep.coverKey,
            status: "ok",
          });
        } catch (err) {
          results.push({
            file: prep.file,
            status: "failed",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // 6. Write updated manifest
      const updatedPosts = Array.from(manifestPostsMap.values()).sort(
        (a, b) =>
          Date.parse(b.meta.publishedAt!) - Date.parse(a.meta.publishedAt!) ||
          a.meta.slug.localeCompare(b.meta.slug),
      );

      const newManifest: Manifest = {
        version: 1,
        posts: updatedPosts,
      };

      manifestSchema.parse(newManifest);
      await this.storage.put(
        MANIFEST_KEY,
        bytes(JSON.stringify(newManifest, null, 2)),
        "application/json",
      );

      const publishedCount = results.filter((r) => r.status === "ok").length;
      return {
        total: items.length,
        published: publishedCount,
        failed: items.length - publishedCount,
        results,
      };
    } finally {
      await this.releaseLock(lockOwner);
    }
  }

  /**
   * Publish a single blog post directly.
   * Delegates to publishBulk for consistency and returns single-post result.
   */
  async publish(
    filePath: string,
    options: {
      coverPath?: string;
      compress?: boolean;
      maxWidth?: number;
      quality?: number;
    } = {},
  ): Promise<PublishResult> {
    const bulk = await this.publishBulk(
      [
        {
          file: filePath,
          cover: options.coverPath,
          compress: options.compress,
        },
      ],
      {
        compress: options.compress,
        maxWidth: options.maxWidth,
        quality: options.quality,
      },
    );
    const first = bulk.results[0];

    if (!first || first.status === "failed") {
      throw new Error(first ? first.error : "Publish failed");
    }

    const manifest = await this.manifest(true);
    const entry = manifest.posts.find((p) => p.meta.slug === first.slug);

    return {
      success: true,
      slug: first.slug,
      title: first.title,
      url: first.url,
      contentKey: first.contentKey,
      cover: first.cover,
      assets: (entry?.assets as string[]) || [],
    };
  }

  /**
   * Update existing blog post(s) in bulk under a single atomic lock.
   * Can edit: title, description, markdown body (.md file), cover image, cover alt, category, tags, author.
   * Automatically compresses new cover or inline images to WebP if compress is enabled.
   */
  async updatePostBulk(
    items: UpdatePostItem[],
    options?: UpdatePostOptions,
  ): Promise<BulkUpdateResult> {
    if (!items.length) {
      return { total: 0, updated: 0, failed: 0, results: [] };
    }

    const lockOwner = await this.acquireLock();
    try {
      const manifest = await this.manifest(true);
      const manifestPostsMap = new Map<string, Entry>(
        manifest.posts.map((p) => [p.meta.slug, p]),
      );
      const results: BulkUpdateResult["results"] = [];
      const now = new Date().toISOString();

      for (const item of items) {
        try {
          const slug = item.slug;
          const existing = manifestPostsMap.get(slug);
          if (!existing) {
            throw new Error(`Post "${slug}" not found in published manifest`);
          }

          const shouldCompress = item.compress ?? options?.compress ?? true;
          const compressOpts: CompressOptions | undefined = shouldCompress
            ? {
                maxWidth: options?.maxWidth,
                quality: options?.quality,
              }
            : undefined;

          let rawBody: string;
          let baseMeta: Post = { ...existing.meta };
          const assets = new Set<string>(existing.assets || []);

          // 1. If new markdown file is provided, read and parse it
          if (item.file) {
            const rawContent = await readFile(item.file, "utf8");
            const parsed = parsePost(rawContent, true);
            rawBody = parsed.body;
            baseMeta = {
              ...baseMeta,
              ...parsed.meta,
              slug,
            };
            const baseDir = dirname(item.file);

            // Resolve inline images if any
            const inlineImages = await readInlineImages(baseDir, rawBody);
            const urlMap = new Map<string, string>();

            for (const [src, img] of Object.entries(inlineImages)) {
              if (shouldCompress) {
                const compressed = await compressImage(img.bytes, compressOpts);
                const baseFilename = img.filename.replace(/\.[^.]+$/, "");
                const newFilename = `${baseFilename}${compressed.ext}`;
                const assetKey = `blog/posts/${slug}/images/${newFilename}`;
                await this.storage.put(
                  assetKey,
                  compressed.bytes,
                  compressed.type,
                );
                urlMap.set(src, cdnUrl(assetKey));
                assets.add(assetKey);
              } else {
                const assetKey = `blog/posts/${slug}/images/${img.filename}`;
                await this.storage.put(assetKey, img.bytes, img.type);
                urlMap.set(src, cdnUrl(assetKey));
                assets.add(assetKey);
              }
            }

            rawBody = rewriteImageUrls(rawBody, urlMap);
          } else {
            // Read existing markdown body from R2
            const stored = await this.storage.get(existing.key);
            if (!stored) {
              throw new Error(
                `Content key "${existing.key}" not found in storage`,
              );
            }
            const parsed = parsePost(text(stored), true);
            rawBody = parsed.body;
          }

          // 2. Resolve cover image update if provided
          let coverKey = baseMeta.cover.src;
          const coverAlt = item.coverAlt ?? baseMeta.cover.alt;

          if (item.cover) {
            const coverPath = item.cover;
            const isLocal =
              coverPath.startsWith("./") ||
              (!coverPath.startsWith("https://") &&
                !coverPath.startsWith("blog/posts/"));

            if (isLocal) {
              const rawCoverBytes = await readFile(coverPath);
              const rawMime = imageType(rawCoverBytes);

              if (shouldCompress) {
                const compressed = await compressImage(
                  rawCoverBytes,
                  compressOpts,
                );
                coverKey = `blog/posts/${slug}/cover${compressed.ext}`;
                await this.storage.put(
                  coverKey,
                  compressed.bytes,
                  compressed.type,
                );
              } else {
                const ext =
                  extname(coverPath).toLowerCase() ||
                  (rawMime === "image/jpeg"
                    ? ".jpg"
                    : "." + rawMime.split("/")[1]);
                coverKey = `blog/posts/${slug}/cover${ext}`;
                await this.storage.put(coverKey, rawCoverBytes, rawMime);
              }
              assets.add(coverKey);
            } else {
              coverKey = item.cover;
            }
          }

          // 3. Process tags if provided
          let tags = baseMeta.tags;
          if (item.tags !== undefined) {
            const rawTags = Array.isArray(item.tags)
              ? item.tags
              : item.tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
            tags = [...new Set(rawTags.map(normalizeTag))].sort();
          }

          // 4. Construct updated Post metadata
          const updatedMeta: Post = postSchema.parse({
            version: 1,
            title: item.title ?? baseMeta.title,
            slug,
            description: item.description ?? baseMeta.description,
            author: item.author ?? baseMeta.author,
            status: "published",
            category: item.category ?? baseMeta.category,
            tags,
            publishedAt: existing.meta.publishedAt,
            updatedAt: now,
            cover: {
              src: coverKey,
              alt: coverAlt,
            },
          });

          // 5. Serialize and store updated post.md in R2
          const finalMarkdown = serializePost(updatedMeta, rawBody);
          await this.storage.put(
            existing.key,
            bytes(finalMarkdown),
            "text/markdown; charset=utf-8",
          );

          // 6. Update manifest entry
          const updatedEntry: Entry = {
            meta: updatedMeta,
            key: existing.key,
            revision: hash(finalMarkdown),
            assets: Array.from(assets).sort(),
          };

          manifestPostsMap.set(slug, updatedEntry);

          // 7. Update database mirror
          await syncPostToDb(updatedEntry);

          results.push({
            slug,
            title: updatedMeta.title,
            url: siteUrl(`/blog/${slug}`),
            contentKey: existing.key,
            cover: coverKey,
            status: "ok",
          });
        } catch (err) {
          results.push({
            slug: item.slug,
            status: "failed",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Write updated manifest
      const updatedPosts = Array.from(manifestPostsMap.values()).sort(
        (a, b) =>
          Date.parse(b.meta.publishedAt!) - Date.parse(a.meta.publishedAt!) ||
          a.meta.slug.localeCompare(b.meta.slug),
      );

      const newManifest: Manifest = {
        version: 1,
        posts: updatedPosts,
      };

      manifestSchema.parse(newManifest);
      await this.storage.put(
        MANIFEST_KEY,
        bytes(JSON.stringify(newManifest, null, 2)),
        "application/json",
      );

      const updatedCount = results.filter((r) => r.status === "ok").length;
      return {
        total: items.length,
        updated: updatedCount,
        failed: items.length - updatedCount,
        results,
      };
    } finally {
      await this.releaseLock(lockOwner);
    }
  }

  /**
   * Update a single blog post directly.
   */
  async updatePost(
    slug: string,
    updates: Omit<UpdatePostItem, "slug">,
    options?: UpdatePostOptions,
  ): Promise<UpdateResult> {
    const bulk = await this.updatePostBulk([{ slug, ...updates }], options);
    const first = bulk.results[0];

    if (!first || first.status === "failed") {
      throw new Error(first ? first.error : `Update failed for "${slug}"`);
    }

    const manifest = await this.manifest(true);
    const entry = manifest.posts.find((p) => p.meta.slug === slug);

    return {
      success: true,
      slug: first.slug,
      title: first.title,
      url: first.url,
      contentKey: first.contentKey,
      cover: first.cover,
      assets: (entry?.assets as string[]) || [],
    };
  }

  /** Unpublish a post by removing it from the published manifest. */
  async unpublish(slug: string): Promise<{ success: true; slug: string }> {
    const lockOwner = await this.acquireLock();
    try {
      const manifest = await this.manifest();
      const exists = manifest.posts.some((p) => p.meta.slug === slug);
      if (!exists) {
        throw new Error(`Post "${slug}" is not currently published`);
      }

      const updatedPosts = manifest.posts.filter((p) => p.meta.slug !== slug);
      const newManifest: Manifest = {
        version: 1,
        posts: updatedPosts,
      };

      await this.storage.put(
        MANIFEST_KEY,
        bytes(JSON.stringify(newManifest, null, 2)),
        "application/json",
      );

      await setDbPostStatus(slug, "draft");

      return { success: true, slug };
    } finally {
      await this.releaseLock(lockOwner);
    }
  }

  /** Delete a post from manifest, R2 storage, and DB mirror. */
  async deletePost(
    slug: string,
  ): Promise<{ success: true; slug: string; deletedKeys: string[] }> {
    const lockOwner = await this.acquireLock();
    try {
      const manifest = await this.manifest(true);
      const updatedPosts = manifest.posts.filter((p) => p.meta.slug !== slug);

      const newManifest: Manifest = {
        version: 1,
        posts: updatedPosts,
      };

      await this.storage.put(
        MANIFEST_KEY,
        bytes(JSON.stringify(newManifest, null, 2)),
        "application/json",
      );

      // Delete all objects under blog/posts/<slug>/
      const prefix = `blog/posts/${slug}/`;
      const objects = await this.storage.list(prefix);
      const deletedKeys: string[] = [];

      for (const obj of objects) {
        await this.storage.remove(obj.key);
        deletedKeys.push(obj.key);
      }

      await deleteDbPost(slug);

      return { success: true, slug, deletedKeys };
    } finally {
      await this.releaseLock(lockOwner);
    }
  }

  /** List all published posts from manifest. */
  async list(): Promise<
    Array<{
      slug: string;
      title: string;
      category: string;
      publishedAt: string | null;
      cover: string;
      url: string;
    }>
  > {
    const manifest = await this.manifest(true);
    return manifest.posts.map((p) => ({
      slug: p.meta.slug,
      title: p.meta.title,
      category: p.meta.category,
      publishedAt: p.meta.publishedAt,
      cover: p.meta.cover.src,
      url: siteUrl(`/blog/${p.meta.slug}`),
    }));
  }

  /** Initialize empty blog manifest. */
  async initialize(): Promise<{ success: true; initialized: true }> {
    const lockOwner = await this.acquireLock();
    try {
      const empty: Manifest = { version: 1, posts: [] };
      await this.storage.put(
        MANIFEST_KEY,
        bytes(JSON.stringify(empty, null, 2)),
        "application/json",
      );
      return { success: true, initialized: true };
    } finally {
      await this.releaseLock(lockOwner);
    }
  }
}
