// Run after seed-local.ts and OpenNext preview. Does not mutate content.
const base = process.argv[2] || "http://localhost:8787";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Smoke test is local-only");
const paths = ["/", "/projects", "/privacy", "/terms", "/blog", "/blog?category=ai-agents", "/blog?q=dependable", "/blog/local-preview-fixture", "/blog/local-preview-fixture/raw.md", "/blog/index.json", "/blog/rss.xml", "/llms.txt", "/robots.txt", "/sitemap.xml", "/blog/local-hidden-draft"];
let failures = 0;
for (const path of paths) {
  const response = await fetch(base + path, { headers: { "User-Agent": "Googlebot" } });
  const body = await response.text(), expected = path === "/blog/local-hidden-draft" ? 404 : 200;
  const errors: string[] = [];
  if (response.status !== expected) errors.push("status " + response.status + " expected " + expected);
  if (path.startsWith("/blog") && path !== "/blog/local-hidden-draft" && !response.headers.get("cache-control")?.includes("no-store")) errors.push("missing no-store");
  if (["/blog/index.json", "/blog/rss.xml", "/llms.txt", "/sitemap.xml", "/blog"].includes(path) && body.includes("HIDDEN_DRAFT_MARKER")) errors.push("draft leaked");
  if (path === "/blog/local-preview-fixture") {
    for (const marker of ["WORKER_SSR_ARTICLE_MARKER", 'application/ld+json', 'rel="canonical"', 'property="og:type" content="article"', "Table of contents"])
      if (!body.includes(marker)) errors.push("missing " + marker);
    if (!/<p>WORKER_SSR_ARTICLE_MARKER/.test(body)) errors.push("article absent from rendered HTML paragraph");
  }
  if (path.includes("?") && !body.includes('content="noindex, follow"')) errors.push("filter not noindex");
  if (path.endsWith("/raw.md") && !response.headers.get("link")?.includes('rel="canonical"')) errors.push("raw canonical missing");
  if (errors.length) failures++;
  console.log(JSON.stringify({ path, status: response.status, type: response.headers.get("content-type"), cache: response.headers.get("cache-control"), errors }));
}
if (failures) process.exitCode = 1;
