export const categories = [
  { slug: "engineering", name: "Engineering", description: "Architecture, implementation details, and maintainable software." },
  { slug: "building-products", name: "Building Products", description: "From an idea to a useful product: scope, iteration, and shipping." },
  { slug: "founder-notes", name: "Founder Notes", description: "Practical notes on decisions and trade-offs as a solo founder." },
  { slug: "ai-agents", name: "AI & Agents", description: "Useful AI integrations, agent workflows, and their limitations." },
  { slug: "developer-experience", name: "Developer Experience", description: "Tools, APIs, SDKs, and workflows that make development better." },
  { slug: "cloud-performance", name: "Cloud & Performance", description: "Deploying, measuring, and operating fast, reliable applications." },
  { slug: "design-accessibility", name: "Design & Accessibility", description: "Thoughtful interfaces and inclusive web experiences." },
] as const;

export const defaultAuthor = () => process.env.BLOG_AUTHOR?.trim() || "Murtaza Baanihali";

export function origin(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name}`);
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error(`${name} must be an HTTPS origin (HTTP allowed for localhost)`);
  }
  return url.origin;
}
export const siteUrl = (path = "/") => new URL(path, origin(process.env.NEXT_PUBLIC_APP_URL, "NEXT_PUBLIC_APP_URL")).href;
export const cdnUrl = (key: string) => {
  const base = origin(process.env.BLOG_CDN_URL, "BLOG_CDN_URL");
  if (new URL(base).hostname.endsWith(".r2.dev")) throw new Error("Use an R2 custom domain, not r2.dev");
  return new URL(key, base + "/").href;
};
export function coverUrl(src: string) {
  return src.startsWith("https://") ? src : cdnUrl(src);
}
export const HEAD_KEY = "blog/head.json";
export const OBJECT_PREFIX = "blog/objects/";
export const GRACE_MS = 15 * 60 * 1000;
