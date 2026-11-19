import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BlogService, findPostsInDir } from "../core";
import { migrateBlogs } from "../migrate";
import { bytes, text, Conflict, type Storage, type Stored } from "../storage";
import {
  hash,
  imageType,
  readInlineImages,
  compressImage,
  compressFileOrDir,
  DEFAULT_MAX_IMAGE_WIDTH,
  DEFAULT_IMAGE_QUALITY,
} from "../images";
import sharp from "sharp";
import {
  parsePost,
  serializePost,
  rewriteImageUrls,
  imageNodes,
  manifestSchema,
  type Post,
  type Entry,
} from "../../../lib/blog/contract";
import { MANIFEST_KEY, HEAD_KEY, LOCK_KEY } from "../../../lib/blog/config";

process.env.NODE_ENV = "test";
delete process.env.DATABASE_URL;
process.env.NEXT_PUBLIC_APP_URL = "https://portfolio.example.com";
process.env.NEXT_PUBLIC_MEDIA_CDN_DOMAIN = "https://content.example.com";

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY9sAAAAASUVORK5CYII=",
  "base64",
);

/** In-memory mock storage implementation for testing. */
class MemoryStorage implements Storage {
  objects = new Map<string, { bytes: Uint8Array; etag: string; type: string }>();

  async get(key: string): Promise<Stored | null> {
    const item = this.objects.get(key);
    if (!item) return null;
    return { bytes: item.bytes, etag: item.etag };
  }

  async put(
    key: string,
    data: Uint8Array,
    type: string,
    condition?: { match?: string; absent?: boolean },
  ): Promise<void> {
    if (condition?.absent && this.objects.has(key)) {
      throw new Conflict("Key already exists");
    }
    if (condition?.match && this.objects.get(key)?.etag !== condition.match) {
      throw new Conflict("ETag mismatch");
    }
    const etag = hash(data);
    this.objects.set(key, { bytes: data, etag, type });
  }

  async remove(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(prefix: string): Promise<{ key: string; modified: number }[]> {
    const matches: { key: string; modified: number }[] = [];
    for (const key of this.objects.keys()) {
      if (key.startsWith(prefix)) {
        matches.push({ key, modified: Date.now() });
      }
    }
    return matches;
  }
}

describe("images and formats", () => {
  test("identifies PNG, JPEG, WebP and rejects invalid formats", () => {
    expect(imageType(pngBytes)).toBe("image/png");

    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(imageType(jpegBytes)).toBe("image/jpeg");

    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(imageType(webpBytes)).toBe("image/webp");

    expect(() => imageType(Buffer.from("<svg></svg>"))).toThrow(
      "Invalid image",
    );
    expect(() => imageType(Buffer.from("not an image"))).toThrow(
      "Invalid image",
    );
  });

  test("reads and validates inline images referenced in markdown", async () => {
    const temp = await mkdtemp(join(tmpdir(), "blog-test-inline-"));
    try {
      await mkdir(join(temp, "images"));
      await writeFile(join(temp, "images", "diagram.png"), pngBytes);

      const body = "Some text\n\n![Diagram](./images/diagram.png)\n\nMore text";
      const images = await readInlineImages(temp, body);

      expect(images["./images/diagram.png"]).toBeDefined();
      expect(images["./images/diagram.png"].type).toBe("image/png");
      expect(images["./images/diagram.png"].filename).toBe("diagram.png");
    } finally {
      await rm(temp, { recursive: true });
    }
  });

  test("throws error when referenced inline image is missing", async () => {
    const temp = await mkdtemp(join(tmpdir(), "blog-test-missing-"));
    try {
      const body = "![Missing](./images/missing.png)";
      await expect(readInlineImages(temp, body)).rejects.toThrow("not found");
    } finally {
      await rm(temp, { recursive: true });
    }
  });

  test("rewrites inline image URLs to CDN URLs without altering prose", () => {
    const body =
      "Check this out:\n\n![Diagram](./images/diagram.png)\n\nReferenced here: ./images/diagram.png";
    const urlMap = new Map([
      ["./images/diagram.png", "https://content.example.com/blog/posts/slug/images/diagram.png"],
    ]);

    const rewritten = rewriteImageUrls(body, urlMap);
    expect(rewritten).toContain(
      "![Diagram](https://content.example.com/blog/posts/slug/images/diagram.png)",
    );
    expect(rewritten).toContain("Referenced here: ./images/diagram.png");
  });
});

describe("BlogService publishing and management", () => {
  const sampleMeta: Post = {
    version: 1,
    title: "Building Reliable Architecture",
    slug: "building-reliable-architecture",
    description: "A comprehensive guide to building reliable cloud architecture with clean design principles.",
    author: "Murtaza Baanihali",
    status: "published",
    category: "engineering",
    tags: ["architecture", "cloud"],
    publishedAt: null,
    updatedAt: null,
    cover: {
      src: "./cover.png",
      alt: "Minimalist ink drawing of architectural scaffolding",
    },
  };

  test("publishes a post with local cover and updates manifest", async () => {
    const temp = await mkdtemp(join(tmpdir(), "blog-test-publish-"));
    try {
      await writeFile(join(temp, "cover.png"), pngBytes);
      const postContent = serializePost(
        sampleMeta,
        "## Introduction\n\nThis is a complete and substantive article body about clean architecture.",
      );
      const postFile = join(temp, "post.md");
      await writeFile(postFile, postContent);

      const storage = new MemoryStorage();
      const service = new BlogService(storage);

      const result = await service.publish(postFile);

      expect(result.success).toBe(true);
      expect(result.slug).toBe("building-reliable-architecture");
      expect(result.contentKey).toBe("blog/posts/building-reliable-architecture/post.md");
      expect(result.cover).toBe("blog/posts/building-reliable-architecture/cover.png");

      // Verify stored markdown in R2
      const storedPost = await storage.get(result.contentKey);
      expect(storedPost).not.toBeNull();
      const parsedPost = parsePost(text(storedPost!), true);
      expect(parsedPost.meta.status).toBe("published");
      expect(parsedPost.meta.publishedAt).toBeDefined();

      // Verify stored cover in R2
      const storedCover = await storage.get(result.cover);
      expect(storedCover).not.toBeNull();

      // Verify manifest in R2
      const manifest = await service.manifest();
      expect(manifest.posts.length).toBe(1);
      expect(manifest.posts[0].meta.slug).toBe("building-reliable-architecture");
      expect(manifest.posts[0].key).toBe(result.contentKey);
    } finally {
      await rm(temp, { recursive: true });
    }
  });

  test("republishing updates existing post while preserving original publishedAt", async () => {
    const temp = await mkdtemp(join(tmpdir(), "blog-test-republish-"));
    try {
      await writeFile(join(temp, "cover.png"), pngBytes);
      const postFile = join(temp, "post.md");
      await writeFile(
        postFile,
        serializePost(sampleMeta, "Initial substantive article content here."),
      );

      const storage = new MemoryStorage();
      const service = new BlogService(storage);

      const res1 = await service.publish(postFile);
      const initialPublishedAt = (await service.manifest()).posts[0].meta.publishedAt;

      // Wait a tiny bit and update
      await new Promise((r) => setTimeout(r, 10));
      await writeFile(
        postFile,
        serializePost(sampleMeta, "Updated substantive article content with new insights."),
      );

      const res2 = await service.publish(postFile);
      const updatedManifest = await service.manifest();

      expect(updatedManifest.posts.length).toBe(1);
      expect(updatedManifest.posts[0].meta.publishedAt).toBe(initialPublishedAt);
      expect(
        Date.parse(updatedManifest.posts[0].meta.updatedAt!) >=
          Date.parse(initialPublishedAt!),
      ).toBe(true);
    } finally {
      await rm(temp, { recursive: true });
    }
  });

  test("unpublish removes post from manifest", async () => {
    const temp = await mkdtemp(join(tmpdir(), "blog-test-unpublish-"));
    try {
      await writeFile(join(temp, "cover.png"), pngBytes);
      const postFile = join(temp, "post.md");
      await writeFile(
        postFile,
        serializePost(
          sampleMeta,
          "## Substantive Heading\n\nContent to unpublish later with more than 40 characters in the article body.",
        ),
      );

      const storage = new MemoryStorage();
      const service = new BlogService(storage);
      await service.publish(postFile);

      expect((await service.manifest()).posts.length).toBe(1);

      const res = await service.unpublish("building-reliable-architecture");
      expect(res.success).toBe(true);
      expect((await service.manifest()).posts.length).toBe(0);
    } finally {
      await rm(temp, { recursive: true });
    }
  });

  test("deletePost removes post from manifest and cleans up files", async () => {
    const temp = await mkdtemp(join(tmpdir(), "blog-test-delete-"));
    try {
      await writeFile(join(temp, "cover.png"), pngBytes);
      const postFile = join(temp, "post.md");
      await writeFile(
        postFile,
        serializePost(
          sampleMeta,
          "## Substantive Heading\n\nContent to delete completely with more than 40 characters in the article body.",
        ),
      );

      const storage = new MemoryStorage();
      const service = new BlogService(storage);
      await service.publish(postFile);

      const res = await service.deletePost("building-reliable-architecture");
      expect(res.success).toBe(true);
      expect(res.deletedKeys).toContain(
        "blog/posts/building-reliable-architecture/post.md",
      );
      expect(res.deletedKeys).toContain(
        "blog/posts/building-reliable-architecture/cover.png",
      );

      expect((await service.manifest()).posts.length).toBe(0);
      expect(
        await storage.get("blog/posts/building-reliable-architecture/post.md"),
      ).toBeNull();
    } finally {
      await rm(temp, { recursive: true });
    }
  });

  test("publishes multiple posts in bulk under one atomic lock", async () => {
    const temp = await mkdtemp(join(tmpdir(), "blog-test-bulk-"));
    try {
      await mkdir(join(temp, "post-1"));
      await mkdir(join(temp, "post-2"));

      await writeFile(join(temp, "post-1", "cover.png"), pngBytes);
      await writeFile(join(temp, "post-2", "cover.png"), pngBytes);

      const meta1: Post = {
        ...sampleMeta,
        slug: "bulk-post-1",
        title: "Bulk Post Number One",
      };
      const meta2: Post = {
        ...sampleMeta,
        slug: "bulk-post-2",
        title: "Bulk Post Number Two",
      };

      const file1 = join(temp, "post-1", "post.md");
      const file2 = join(temp, "post-2", "post.md");

      await writeFile(
        file1,
        serializePost(meta1, "## Substantive Heading 1\n\nBody for first bulk post with enough characters."),
      );
      await writeFile(
        file2,
        serializePost(meta2, "## Substantive Heading 2\n\nBody for second bulk post with enough characters."),
      );

      const storage = new MemoryStorage();
      const service = new BlogService(storage);

      const bulkResult = await service.publishBulk([
        { file: file1 },
        { file: file2 },
      ]);

      expect(bulkResult.total).toBe(2);
      expect(bulkResult.published).toBe(2);
      expect(bulkResult.failed).toBe(0);

      const manifest = await service.manifest();
      expect(manifest.posts.length).toBe(2);
      expect(manifest.posts.some((p) => p.meta.slug === "bulk-post-1")).toBe(true);
      expect(manifest.posts.some((p) => p.meta.slug === "bulk-post-2")).toBe(true);

      // Verify files in R2
      expect(await storage.get("blog/posts/bulk-post-1/post.md")).not.toBeNull();
      expect(await storage.get("blog/posts/bulk-post-2/post.md")).not.toBeNull();
    } finally {
      await rm(temp, { recursive: true });
    }
  });

  test("handles partial failures during bulk publishing without discarding valid posts", async () => {
    const temp = await mkdtemp(join(tmpdir(), "blog-test-bulk-partial-"));
    try {
      await mkdir(join(temp, "valid"));
      await mkdir(join(temp, "invalid"));

      await writeFile(join(temp, "valid", "cover.png"), pngBytes);

      const validMeta: Post = {
        ...sampleMeta,
        slug: "valid-post",
        title: "Valid Post Title Here",
      };
      const validFile = join(temp, "valid", "post.md");
      await writeFile(
        validFile,
        serializePost(validMeta, "## Valid Post\n\nThis is a substantive valid post body for testing."),
      );

      // Invalid post: references cover.png that does not exist
      const invalidMeta: Post = {
        ...sampleMeta,
        slug: "invalid-post",
        title: "Invalid Post Title Here",
        cover: { src: "./missing-cover.png", alt: "Missing image" },
      };
      const invalidFile = join(temp, "invalid", "post.md");
      await writeFile(
        invalidFile,
        serializePost(invalidMeta, "## Invalid Post\n\nThis post has a missing cover image file."),
      );

      const storage = new MemoryStorage();
      const service = new BlogService(storage);

      const bulkResult = await service.publishBulk([
        { file: validFile },
        { file: invalidFile },
      ]);

      expect(bulkResult.total).toBe(2);
      expect(bulkResult.published).toBe(1);
      expect(bulkResult.failed).toBe(1);

      const validRes = bulkResult.results.find((r) => r.status === "ok");
      expect(validRes).toBeDefined();

      const invalidRes = bulkResult.results.find((r) => r.status === "failed");
      expect(invalidRes).toBeDefined();

      // Valid post made it into manifest
      const manifest = await service.manifest();
      expect(manifest.posts.length).toBe(1);
      expect(manifest.posts[0].meta.slug).toBe("valid-post");
    } finally {
      await rm(temp, { recursive: true });
    }
  });

  test("findPostsInDir discovers posts in subdirectories and folders", async () => {
    const temp = await mkdtemp(join(tmpdir(), "blog-test-find-"));
    try {
      await mkdir(join(temp, "sub-1"));
      await mkdir(join(temp, "sub-2"));

      await writeFile(join(temp, "sub-1", "post.md"), "test");
      await writeFile(join(temp, "sub-2", "article.md"), "test");

      const found = await findPostsInDir(temp);
      expect(found.length).toBe(2);
      expect(found[0]).toContain("post.md");
      expect(found[1]).toContain("article.md");
    } finally {
      await rm(temp, { recursive: true });
    }
  });

  test("lock prevents concurrent operations and releases cleanly", async () => {
    const storage = new MemoryStorage();
    const service = new BlogService(storage);

    const owner = await service.acquireLock();
    expect((await service.lockStatus()).locked).toBe(true);

    await expect(service.acquireLock()).rejects.toThrow("Publishing lock held");

    await service.releaseLock(owner);
    expect((await service.lockStatus()).locked).toBe(false);
  });
});

describe("Migration from legacy structure", () => {
  test("migrates legacy head/objects layout to blog/posts/<slug>/ and blog/manifest.json", async () => {
    const storage = new MemoryStorage();

    const postMeta: Post = {
      version: 1,
      title: "Migrated Article Title",
      slug: "migrated-article",
      description: "An article being migrated from legacy UUID object storage layout to clean folder structure.",
      author: "Murtaza Baanihali",
      status: "published",
      category: "technology",
      tags: ["migration", "tech"],
      publishedAt: "2024-05-01T10:00:00Z",
      updatedAt: "2024-05-01T10:00:00Z",
      cover: {
        src: "blog/objects/old-uuid/cover.png",
        alt: "Clean technical line sketch",
      },
    };

    const oldRaw = serializePost(
      postMeta,
      "This is the migrated body of the article.",
    );
    const oldEntry: Entry = {
      meta: postMeta,
      key: "blog/objects/old-uuid/post.md" as any,
      revision: hash(oldRaw),
      assets: ["blog/objects/old-uuid/cover.png" as any],
    };

    // Populate mock legacy structure
    await storage.put("blog/objects/old-uuid/cover.png", pngBytes, "image/png");
    await storage.put(
      "blog/objects/old-uuid/post.md",
      bytes(oldRaw),
      "text/markdown",
    );
    await storage.put(
      "blog/objects/old-uuid/manifest.json",
      bytes(JSON.stringify({ version: 1, posts: [oldEntry] })),
      "application/json",
    );
    await storage.put(
      HEAD_KEY,
      bytes(
        JSON.stringify({
          version: 1,
          commit: "old-uuid",
          manifest: "blog/objects/old-uuid/manifest.json",
          inventory: "blog/objects/old-uuid/manifest.json",
        }),
      ),
      "application/json",
    );

    const stats = await migrateBlogs(storage, { yes: true });

    expect(stats.migrated).toBe(1);
    expect(stats.failed).toBe(0);

    // Verify new manifest exists
    const manifestStored = await storage.get(MANIFEST_KEY);
    expect(manifestStored).not.toBeNull();
    const manifest = manifestSchema.parse(JSON.parse(text(manifestStored!)));
    expect(manifest.posts.length).toBe(1);
    expect(manifest.posts[0].meta.slug).toBe("migrated-article");
    expect(manifest.posts[0].key).toBe("blog/posts/migrated-article/post.md");
    expect(manifest.posts[0].meta.cover.src).toBe(
      "blog/posts/migrated-article/cover.png",
    );

    // Verify new files in R2
    expect(
      await storage.get("blog/posts/migrated-article/post.md"),
    ).not.toBeNull();
    expect(
      await storage.get("blog/posts/migrated-article/cover.png"),
    ).not.toBeNull();
  });
});

describe("sharp image compression and automated publishing optimization", () => {
  test("compressImage converts large image to WebP with max-width 1000px and quality 70", async () => {
    const rawLarge = await sharp({
      create: {
        width: 1400,
        height: 700,
        channels: 4,
        background: { r: 40, g: 80, b: 120, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await compressImage(rawLarge);
    expect(result.type).toBe("image/webp");
    expect(result.ext).toBe(".webp");
    expect(result.width).toBe(DEFAULT_MAX_IMAGE_WIDTH); // 1000px
    expect(result.height).toBe(500); // scaled proportionally from 1400x700
    expect(result.compressedSize).toBeLessThan(result.originalSize);
    expect(result.bytes.byteLength).toBe(result.compressedSize);
  });

  test("compressImage preserves dimensions for images smaller than max-width", async () => {
    const rawSmall = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 4,
        background: { r: 200, g: 100, b: 50, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await compressImage(rawSmall);
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
    expect(result.type).toBe("image/webp");
  });

  test("compressFileOrDir compresses directory and rewrites post.md references", async () => {
    const temp = await mkdtemp(join(tmpdir(), "blog-compress-dir-"));
    try {
      await mkdir(join(temp, "images"));

      const coverBuffer = await sharp({
        create: {
          width: 1200,
          height: 675,
          channels: 4,
          background: { r: 10, g: 20, b: 30, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const inlineBuffer = await sharp({
        create: {
          width: 800,
          height: 400,
          channels: 4,
          background: { r: 50, g: 60, b: 70, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      await writeFile(join(temp, "cover.png"), coverBuffer);
      await writeFile(join(temp, "images", "chart.png"), inlineBuffer);

      const postContent = `---
version: 1
title: "Article with Images to Compress"
slug: article-with-images
description: "Testing automated compression on disk for article and image references."
author: Murtaza Baanihali
status: published
category: engineering
tags:
  - testing
publishedAt: 2024-01-01T00:00:00Z
updatedAt: 2024-01-01T00:00:00Z
cover:
  src: "./cover.png"
  alt: "Cover image preview"
---

## Section

Here is an inline diagram:

![Chart](./images/chart.png)
`;
      await writeFile(join(temp, "post.md"), postContent);

      const summary = await compressFileOrDir(temp);
      expect(summary.total).toBe(2);
      expect(summary.processed).toBe(2);
      expect(summary.savedBytes).toBeGreaterThan(0);

      // Verify .webp files exist
      const { stat } = await import("node:fs/promises");
      const coverStat = await stat(join(temp, "cover.webp"));
      expect(coverStat.isFile()).toBe(true);

      const chartStat = await stat(join(temp, "images", "chart.webp"));
      expect(chartStat.isFile()).toBe(true);

      // Verify post.md was updated
      const updatedMd = await import("node:fs/promises").then((fs) =>
        fs.readFile(join(temp, "post.md"), "utf8"),
      );
      expect(updatedMd).toContain('src: "./cover.webp"');
      expect(updatedMd).toContain("![Chart](./images/chart.webp)");
    } finally {
      await rm(temp, { recursive: true });
    }
  });

  test("BlogService.publish automatically compresses cover and inline images to WebP when compress is true", async () => {
    const temp = await mkdtemp(join(tmpdir(), "blog-publish-compress-"));
    try {
      await mkdir(join(temp, "images"));

      const coverBuffer = await sharp({
        create: {
          width: 1400,
          height: 700,
          channels: 4,
          background: { r: 15, g: 30, b: 45, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const inlineBuffer = await sharp({
        create: {
          width: 1200,
          height: 600,
          channels: 4,
          background: { r: 60, g: 75, b: 90, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      await writeFile(join(temp, "cover.png"), coverBuffer);
      await writeFile(join(temp, "images", "benchmarks.png"), inlineBuffer);

      const postContent = `---
version: 1
title: "Article with Automated Compression"
slug: article-auto-compress
description: "Testing R2 publishing pipeline with automatic sharp image compression."
author: Murtaza Baanihali
status: published
category: engineering
tags:
  - performance
publishedAt: null
updatedAt: null
cover:
  src: "./cover.png"
  alt: "Auto compressed cover"
---

## Benchmarks

![Benchmark Results](./images/benchmarks.png)
`;
      await writeFile(join(temp, "post.md"), postContent);

      const storage = new MemoryStorage();
      const service = new BlogService(storage);

      const result = await service.publish(join(temp, "post.md"), {
        compress: true,
      });

      expect(result.success).toBe(true);
      expect(result.cover).toBe("blog/posts/article-auto-compress/cover.webp");
      expect(result.assets).toContain("blog/posts/article-auto-compress/cover.webp");
      expect(result.assets).toContain(
        "blog/posts/article-auto-compress/images/benchmarks.webp",
      );

      // Verify stored cover in R2 is WebP
      const storedCover = await storage.get(
        "blog/posts/article-auto-compress/cover.webp",
      );
      expect(storedCover).not.toBeNull();
      expect(imageType(storedCover!.bytes)).toBe("image/webp");

      // Verify stored inline image in R2 is WebP
      const storedInline = await storage.get(
        "blog/posts/article-auto-compress/images/benchmarks.webp",
      );
      expect(storedInline).not.toBeNull();
      expect(imageType(storedInline!.bytes)).toBe("image/webp");

      // Verify published Markdown body points to CDN WebP URL
      const storedPost = await storage.get(result.contentKey);
      expect(storedPost).not.toBeNull();
      const rawStoredMd = text(storedPost!);
      expect(rawStoredMd).toContain(
        "https://content.example.com/blog/posts/article-auto-compress/images/benchmarks.webp",
      );
    } finally {
      await rm(temp, { recursive: true });
    }
  });
});

describe("BlogService.updatePost and updatePostBulk", () => {
  test("updates title, description, category, and tags without re-uploading file", async () => {
    const temp = await mkdtemp(join(tmpdir(), "blog-test-update-fields-"));
    try {
      const coverBuffer = await sharp({
        create: {
          width: 800,
          height: 450,
          channels: 4,
          background: { r: 10, g: 20, b: 30, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      await writeFile(join(temp, "cover.png"), coverBuffer);
      const originalMd = `---
version: 1
title: "Original Post Title Here"
slug: test-update-post
description: "Original long substantive description that meets character limit requirements."
author: Murtaza Baanihali
status: published
category: engineering
tags:
  - original
publishedAt: 2024-01-01T00:00:00Z
updatedAt: 2024-01-01T00:00:00Z
cover:
  src: "./cover.png"
  alt: "Original cover alt"
---

## Body Header

This is the original body markdown that must be preserved.
`;
      await writeFile(join(temp, "post.md"), originalMd);

      const storage = new MemoryStorage();
      const service = new BlogService(storage);

      await service.publish(join(temp, "post.md"), { compress: false });

      // Now update fields only
      const updateResult = await service.updatePost("test-update-post", {
        title: "Updated Brand New Title Here",
        description: "Updated brand new long description that meets character limits easily.",
        category: "ai-agents",
        tags: ["machine-learning", "agents"],
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.title).toBe("Updated Brand New Title Here");

      // Verify manifest
      const manifest = await service.manifest();
      const post = manifest.posts.find((p) => p.meta.slug === "test-update-post");
      expect(post).toBeDefined();
      expect(post!.meta.title).toBe("Updated Brand New Title Here");
      expect(post!.meta.description).toBe(
        "Updated brand new long description that meets character limits easily.",
      );
      expect(post!.meta.category).toBe("ai-agents");
      expect(post!.meta.tags).toEqual(["agents", "machine-learning"]);
      expect(post!.meta.publishedAt).toBe("2024-01-01T00:00:00Z"); // preserved!
      expect(post!.meta.updatedAt).not.toBe("2024-01-01T00:00:00Z"); // updated!

      // Verify body is intact in R2
      const stored = await storage.get(post!.key);
      const parsed = parsePost(text(stored!), true);
      expect(parsed.body).toContain(
        "This is the original body markdown that must be preserved.",
      );
    } finally {
      await rm(temp, { recursive: true });
    }
  });

  test("updates post content with new .md file and new cover image", async () => {
    const temp = await mkdtemp(join(tmpdir(), "blog-test-update-content-"));
    try {
      const coverBuffer1 = await sharp({
        create: {
          width: 600,
          height: 400,
          channels: 4,
          background: { r: 50, g: 50, b: 50, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const coverBuffer2 = await sharp({
        create: {
          width: 1200,
          height: 675,
          channels: 4,
          background: { r: 100, g: 150, b: 200, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      await writeFile(join(temp, "cover.png"), coverBuffer1);
      await writeFile(join(temp, "new-cover.png"), coverBuffer2);

      const post1 = `---
version: 1
title: "First Draft Title"
slug: dynamic-update-content
description: "Initial substantive description that meets the required length limits."
author: Murtaza Baanihali
status: published
category: engineering
tags:
  - draft
publishedAt: 2024-02-01T00:00:00Z
updatedAt: 2024-02-01T00:00:00Z
cover:
  src: "./cover.png"
  alt: "First cover"
---

## Introduction

This is the initial substantive article body that is long enough to satisfy requirements.
`;
      await writeFile(join(temp, "post1.md"), post1);

      const storage = new MemoryStorage();
      const service = new BlogService(storage);

      await service.publish(join(temp, "post1.md"), { compress: false });

      // Create revised post markdown file
      const post2 = `---
version: 1
title: "Revised Second Draft"
slug: dynamic-update-content
description: "Completely revised substantive description that explains everything clearly."
author: Murtaza Baanihali
status: published
category: developer-experience
tags:
  - revised
publishedAt: null
updatedAt: null
cover:
  src: "./cover.png"
  alt: "Second cover alt text"
---

## Comprehensive Revision

Completely overhauled article body with new technical deep dives and full explanations.
`;
      await writeFile(join(temp, "post2.md"), post2);

      // Update using --file and --cover with compression
      const updateResult = await service.updatePost(
        "dynamic-update-content",
        {
          file: join(temp, "post2.md"),
          cover: join(temp, "new-cover.png"),
          coverAlt: "Brand new high-res cover alt text",
        },
        { compress: true },
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.cover).toBe("blog/posts/dynamic-update-content/cover.webp");

      // Verify stored cover in R2 is WebP
      const storedCover = await storage.get(
        "blog/posts/dynamic-update-content/cover.webp",
      );
      expect(storedCover).not.toBeNull();
      expect(imageType(storedCover!.bytes)).toBe("image/webp");

      // Verify stored body in R2 has updated content
      const storedPost = await storage.get(updateResult.contentKey);
      const parsed = parsePost(text(storedPost!), true);
      expect(parsed.body).toContain("Completely overhauled article body");
      expect(parsed.meta.title).toBe("Revised Second Draft");
      expect(parsed.meta.cover.alt).toBe("Brand new high-res cover alt text");
      expect(parsed.meta.publishedAt).toBe("2024-02-01T00:00:00Z"); // retained!
    } finally {
      await rm(temp, { recursive: true });
    }
  });

  test("updatePostBulk updates multiple posts in a single batch and handles errors", async () => {
    const temp = await mkdtemp(join(tmpdir(), "blog-test-bulk-update-"));
    try {
      const coverBuffer = await sharp({
        create: {
          width: 800,
          height: 450,
          channels: 4,
          background: { r: 20, g: 40, b: 60, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      await writeFile(join(temp, "cover.png"), coverBuffer);

      const postA = `---
version: 1
title: "Article Alpha Initial"
slug: article-alpha
description: "Initial description for article alpha that meets all requirements."
author: Murtaza Baanihali
status: published
category: engineering
tags:
  - alpha
publishedAt: 2024-01-10T00:00:00Z
updatedAt: 2024-01-10T00:00:00Z
cover:
  src: "./cover.png"
  alt: "Cover Alpha"
---

## Introduction Alpha

Body of article Alpha that contains enough characters to satisfy the minimum body length requirement.
`;
      const postB = `---
version: 1
title: "Article Beta Initial"
slug: article-beta
description: "Initial description for article beta that meets all requirements."
author: Murtaza Baanihali
status: published
category: engineering
tags:
  - beta
publishedAt: 2024-01-11T00:00:00Z
updatedAt: 2024-01-11T00:00:00Z
cover:
  src: "./cover.png"
  alt: "Cover Beta"
---

## Introduction Beta

Body of article Beta that contains enough characters to satisfy the minimum body length requirement.
`;
      await writeFile(join(temp, "postA.md"), postA);
      await writeFile(join(temp, "postB.md"), postB);

      const storage = new MemoryStorage();
      const service = new BlogService(storage);

      await service.publishBulk([
        { file: join(temp, "postA.md") },
        { file: join(temp, "postB.md") },
      ]);

      // Bulk update Alpha and Beta, plus a non-existent Gamma
      const bulkResult = await service.updatePostBulk([
        {
          slug: "article-alpha",
          title: "Article Alpha Renamed",
          description: "New alpha description that passes all validation rules with ease.",
        },
        {
          slug: "article-beta",
          title: "Article Beta Renamed",
          category: "cloud-performance",
        },
        {
          slug: "article-gamma-does-not-exist",
          title: "Non-existent Gamma Title",
        },
      ]);

      expect(bulkResult.total).toBe(3);
      expect(bulkResult.updated).toBe(2);
      expect(bulkResult.failed).toBe(1);

      const manifest = await service.manifest();
      const alpha = manifest.posts.find((p) => p.meta.slug === "article-alpha");
      const beta = manifest.posts.find((p) => p.meta.slug === "article-beta");

      expect(alpha!.meta.title).toBe("Article Alpha Renamed");
      expect(beta!.meta.title).toBe("Article Beta Renamed");
      expect(beta!.meta.category).toBe("cloud-performance");
    } finally {
      await rm(temp, { recursive: true });
    }
  });
});
