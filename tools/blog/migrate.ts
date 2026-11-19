#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { basename, extname } from "node:path";
import {
  MANIFEST_KEY,
  HEAD_KEY,
  LOCK_KEY,
  cdnUrl,
} from "../../lib/blog/config";
import {
  headSchema,
  manifestSchema,
  parsePost,
  serializePost,
  type Entry,
  type Manifest,
  type Post,
} from "../../lib/blog/contract";
import { bytes, text, R2Storage, type Storage } from "./storage";
import { hash, imageType } from "./images";
import { syncPostToDb } from "./core";

export type MigrationStats = {
  total: number;
  migrated: number;
  failed: number;
  posts: Array<{
    slug: string;
    oldKey: string;
    newKey: string;
    oldCover: string;
    newCover: string;
    status: "ok" | "failed";
    error?: string;
  }>;
};

/**
 * Migrate blog posts and assets from legacy blog/objects/<uuid>/ layout
 * to clean blog/posts/<slug>/ layout in R2 and PostgreSQL DB mirror.
 */
export async function migrateBlogs(
  storage: Storage,
  options: { dryRun?: boolean; yes?: boolean } = {},
): Promise<MigrationStats> {
  if (!options.dryRun && !options.yes) {
    throw new Error("Explicit --yes or --dry-run required for migration");
  }

  // 1. Locate old manifest
  let oldManifest: Manifest | null = null;
  const legacyHead = await storage.get(HEAD_KEY);

  if (legacyHead) {
    try {
      const head = headSchema.parse(JSON.parse(text(legacyHead)));
      const stored = await storage.get(head.manifest);
      if (stored) {
        oldManifest = manifestSchema.parse(JSON.parse(text(stored)));
      }
    } catch (e) {
      console.warn("Failed reading legacy head manifest:", e);
    }
  }

  if (!oldManifest) {
    const direct = await storage.get(MANIFEST_KEY);
    if (direct) {
      oldManifest = manifestSchema.parse(JSON.parse(text(direct)));
    }
  }

  if (!oldManifest || !oldManifest.posts.length) {
    throw new Error("No existing blog posts found in R2 to migrate");
  }

  const stats: MigrationStats = {
    total: oldManifest.posts.length,
    migrated: 0,
    failed: 0,
    posts: [],
  };

  if (options.dryRun) {
    for (const post of oldManifest.posts) {
      const slug = post.meta.slug;
      const newKey = `blog/posts/${slug}/post.md`;
      const oldCover = post.meta.cover.src;
      let newCover = oldCover;

      if (oldCover.startsWith("blog/objects/")) {
        const ext = extname(oldCover) || ".png";
        newCover = `blog/posts/${slug}/cover${ext}`;
      }

      stats.posts.push({
        slug,
        oldKey: post.key,
        newKey,
        oldCover,
        newCover,
        status: "ok",
      });
      stats.migrated++;
    }
    return stats;
  }

  // Acquire lock
  const lockPayload = bytes(
    JSON.stringify({ owner: "migration", acquiredAt: new Date().toISOString() }),
  );
  await storage.put(LOCK_KEY, lockPayload, "application/json");

  try {
    const newPosts: Entry[] = [];

    for (const entry of oldManifest.posts) {
      const slug = entry.meta.slug;
      const targetMarkdownKey = `blog/posts/${slug}/post.md`;

      try {
        console.log(`Migrating post [${slug}]...`);

        // Fetch old markdown
        const storedMarkdown = await storage.get(entry.key);
        if (!storedMarkdown) {
          throw new Error(`Old markdown not found at ${entry.key}`);
        }

        const oldRaw = text(storedMarkdown);
        const parsed = parsePost(oldRaw, true);
        const meta: Post = { ...parsed.meta, status: "published" };
        let body = parsed.body;
        const newAssets: string[] = [];

        // Migrate cover
        let coverKey = meta.cover.src;
        if (coverKey.startsWith("blog/objects/")) {
          const storedCover = await storage.get(coverKey);
          if (storedCover) {
            const mime = imageType(storedCover.bytes);
            const ext =
              extname(coverKey) ||
              (mime === "image/jpeg" ? ".jpg" : "." + mime.split("/")[1]);
            const targetCoverKey = `blog/posts/${slug}/cover${ext}`;

            await storage.put(targetCoverKey, storedCover.bytes, mime);
            coverKey = targetCoverKey;
            newAssets.push(targetCoverKey);
          }
        }
        meta.cover.src = coverKey;

        // Migrate inline assets if any
        for (const asset of entry.assets || []) {
          if (asset === entry.meta.cover.src) continue;
          if (asset.startsWith("blog/objects/")) {
            const storedAsset = await storage.get(asset);
            if (storedAsset) {
              const filename = basename(asset);
              const targetAssetKey = `blog/posts/${slug}/images/${filename}`;
              const mime = imageType(storedAsset.bytes);

              await storage.put(targetAssetKey, storedAsset.bytes, mime);
              newAssets.push(targetAssetKey);

              // Rewrite old CDN URL in body
              const oldCdnUrl = cdnUrl(asset);
              const newCdnUrl = cdnUrl(targetAssetKey);
              body = body.replaceAll(oldCdnUrl, newCdnUrl);
            }
          }
        }

        const finalMarkdown = serializePost(meta, body);

        // Upload new markdown
        await storage.put(
          targetMarkdownKey,
          bytes(finalMarkdown),
          "text/markdown; charset=utf-8",
        );

        const newEntry: Entry = {
          meta,
          key: targetMarkdownKey as `blog/posts/${string}/post.md`,
          revision: hash(finalMarkdown),
          assets: newAssets as any,
        };

        newPosts.push(newEntry);

        // Sync to Neon DB mirror
        await syncPostToDb(newEntry);

        stats.posts.push({
          slug,
          oldKey: entry.key,
          newKey: targetMarkdownKey,
          oldCover: entry.meta.cover.src,
          newCover: meta.cover.src,
          status: "ok",
        });
        stats.migrated++;
      } catch (err) {
        console.error(`Failed migrating [${slug}]:`, err);
        stats.posts.push({
          slug,
          oldKey: entry.key,
          newKey: targetMarkdownKey,
          oldCover: entry.meta.cover.src,
          newCover: entry.meta.cover.src,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
        stats.failed++;
      }
    }

    // Write new clean blog/manifest.json
    const newManifest: Manifest = {
      version: 1,
      posts: newPosts.sort(
        (a, b) =>
          Date.parse(b.meta.publishedAt!) - Date.parse(a.meta.publishedAt!) ||
          a.meta.slug.localeCompare(b.meta.slug),
      ),
    };

    manifestSchema.parse(newManifest);
    await storage.put(
      MANIFEST_KEY,
      bytes(JSON.stringify(newManifest, null, 2)),
      "application/json",
    );

    console.log(
      `Migration complete! Successfully migrated ${stats.migrated} / ${stats.total} posts to blog/posts/<slug>/ and updated blog/manifest.json.`,
    );

    return stats;
  } finally {
    await storage.remove(LOCK_KEY);
  }
}

// Standalone CLI execution
if (import.meta.main) {
  const args = parseArgs({
    args: process.argv.slice(2),
    options: {
      yes: { type: "boolean" },
      "dry-run": { type: "boolean" },
      help: { type: "boolean" },
    },
  });

  if (args.values.help) {
    console.log(`Migrate blog posts from blog/objects/<uuid>/ to blog/posts/<slug>/
Usage: bun tools/blog/migrate.ts [--yes] [--dry-run]
`);
    process.exit(0);
  }

  const storage = new R2Storage();
  migrateBlogs(storage, {
    yes: args.values.yes,
    dryRun: args.values["dry-run"],
  })
    .then((stats) => {
      console.log(JSON.stringify(stats, null, 2));
    })
    .catch((err) => {
      console.error(JSON.stringify({ error: err.message, stack: err.stack }));
      process.exit(1);
    });
}
