import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BlogService, findPostsInDir } from "../core";
import { migrateBlogs } from "../migrate";
import { bytes, text, Conflict, type Storage, type Stored } from "../storage";
import { hash, imageType, readInlineImages } from "../images";
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
