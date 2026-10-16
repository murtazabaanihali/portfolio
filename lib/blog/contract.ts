import { z } from "zod";
import { parseDocument, stringify } from "yaml";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import type { Root, RootContent } from "mdast";
import { categories, defaultAuthor } from "./config";

export const slugSchema = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .refine(s => !["index", "rss", "category", "tag", "raw"].includes(s), "Reserved slug");
export const objectKey = z.string().regex(/^blog\/objects\/[a-zA-Z0-9/_-]+(?:\.[a-z0-9]+)?$/);
const timestamp = z.iso.datetime({ offset: true });
const plainText = z.string().trim().regex(/^[^\x00-\x1f\x7f]+$/, "Metadata must be single-line text without control characters");
export const normalizeTag = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function safeUrl(value: string, image = false): boolean {
  if (/^\/(?!\/)/.test(value) || (!image && value.startsWith("#"))) return !/[\x00-\x20\\]/.test(value);
  try {
    const url = new URL(value);
    return !url.username && !url.password && (url.protocol === "https:" || (!image && url.protocol === "mailto:"));
  } catch { return false; }
}
export const postSchema = z.object({
  version: z.literal(1),
  title: plainText.min(5).max(160),
  slug: slugSchema,
  description: plainText.min(30).max(320),
  author: plainText.min(1).max(120).default(defaultAuthor),
  status: z.enum(["draft", "published"]),
  category: z.string().refine(v => categories.some(c => c.slug === v), "Unknown category"),
  tags: z.array(z.string().min(1).max(60)).max(12).default([])
    .transform(tags => [...new Set(tags.map(normalizeTag))].sort())
    .refine(tags => tags.every(Boolean), "Tags must contain letters or numbers"),
  publishedAt: timestamp.nullable().default(null),
  updatedAt: timestamp.nullable().default(null),
  cover: z.object({
    src: z.string().refine(s => safeUrl(s, true) && s.startsWith("https://") || objectKey.safeParse(s).success ||
      /^\.\/cover\.(png|jpg|jpeg|webp)$/.test(s), "Use HTTPS, a managed object key, or ./cover.png/jpg/webp"),
    alt: plainText.min(5).max(300),
  }).strict(),
}).strict().superRefine((p, ctx) => {
  if (p.status === "published" && (!p.publishedAt || !p.updatedAt))
    ctx.addIssue({ code: "custom", message: "Published posts require publishedAt and updatedAt" });
  if (p.publishedAt && p.updatedAt && Date.parse(p.updatedAt) < Date.parse(p.publishedAt))
    ctx.addIssue({ code: "custom", message: "updatedAt cannot precede publishedAt" });

});
export type Post = z.infer<typeof postSchema>;
export const entrySchema = z.object({
  meta: postSchema,
  key: objectKey,
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  assets: z.array(objectKey),
}).strict();
export type Entry = z.infer<typeof entrySchema>;
export const manifestSchema = z.object({
  version: z.literal(1), posts: z.array(entrySchema),
}).strict().superRefine((m, ctx) => {
  if (m.posts.some(p => p.meta.status !== "published" || p.meta.cover.src.startsWith("./")))
    ctx.addIssue({ code: "custom", message: "Public manifest contains drafts or local covers" });
  if (new Set(m.posts.map(p => p.meta.slug)).size !== m.posts.length)
    ctx.addIssue({ code: "custom", message: "Duplicate slugs" });
});
export const inventorySchema = z.object({
  version: z.literal(1), posts: z.array(entrySchema),
  retired: z.array(z.object({ key: objectKey, at: timestamp })),
}).strict();
export const headSchema = z.object({
  version: z.literal(1), commit: z.string(), manifest: objectKey, inventory: objectKey,
}).strict();
export type Head = z.infer<typeof headSchema>;
export type Inventory = z.infer<typeof inventorySchema>;
export type Manifest = z.infer<typeof manifestSchema>;

export function markdownTree(body: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(body);
}
export function walk(node: Root | RootContent, fn: (node: Root | RootContent) => void) {
  fn(node);
  if ("children" in node) for (const child of node.children) walk(child as RootContent, fn);
}
export function parsePost(raw: string, local = false): { meta: Post; body: string } {
  if (raw.length > 500_000) throw new Error("Markdown exceeds 500KB");
  const match = raw.replace(/^\uFEFF/, "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/);
  if (!match) throw new Error("Expected YAML frontmatter and a nonempty Markdown body");
  const document = parseDocument(match[1], { uniqueKeys: true });
  if (document.errors.length) throw new Error(document.errors[0].message);
  const meta = postSchema.parse(document.toJS({ maxAliasCount: 0 }));
  if (!local && meta.cover.src.startsWith("./")) throw new Error("Local cover not resolved");
  const body = match[2].trim() + "\n";
  if (body.trim().length < 40) throw new Error("Article body is too short");
  walk(markdownTree(body), node => {
    if (node.type === "html") throw new Error("Raw HTML/MDX is not allowed");
    if (node.type === "image" && !node.alt?.trim()) throw new Error("Images require alt text");
    if ("url" in node && !safeUrl(node.url, node.type === "image"))
      throw new Error(`Unsafe or non-absolute Markdown URL: ${node.url}`);
  });
  return { meta, body };
}
export const serializePost = (meta: Post, body: string) => "---\n" + stringify(meta) + "---\n\n" + body.trim() + "\n";
export function articleInfo(body: string) {
  const tree = markdownTree(body), slugger = new GithubSlugger();
  const toc: { id: string; title: string; depth: number }[] = [];
  walk(tree, node => {
    if (node.type === "heading") {
      const title = toString(node), id = slugger.slug(title);
      if (node.depth === 2 || node.depth === 3) toc.push({ id, title, depth: node.depth });
    }
  });
  return { toc, minutes: Math.max(1, Math.ceil(toString(tree).split(/\s+/).length / 220)) };
}
export const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
export const xml = (s: string) => s.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
