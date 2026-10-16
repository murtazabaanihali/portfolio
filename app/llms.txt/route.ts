import { getPublished, sortedPosts } from "@/lib/blog/store";
import { defaultAuthor, siteUrl } from "@/lib/blog/config";
import { discoveryHeaders, unavailableResponse } from "@/lib/blog/discovery";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const posts = sortedPosts((await getPublished()).posts);
    const clean = (s: string) => s.replace(/[\r\n\[\]<>]/g, " ");
    return new Response(`# ${clean(defaultAuthor())}

> Full-stack developer and solo founder. Practical writing on engineering, AI agents, products, and founder decisions.

## Site
- [Portfolio](${siteUrl()}): Background and contact information.
- [Projects](${siteUrl("/projects")}): Selected work.
- [Blog](${siteUrl("/blog")}): Published articles.
- [Published index](${siteUrl("/blog/index.json")}): Versioned metadata and HTML/Markdown links.
- [RSS](${siteUrl("/blog/rss.xml")})
- [Sitemap](${siteUrl("/sitemap.xml")})

## Articles
${posts.map(({ meta: p }) => `- [${clean(p.title)}](${siteUrl("/blog/" + p.slug)}): ${clean(p.description)} [Markdown](${siteUrl("/blog/" + p.slug + "/raw.md")})`).join("\n")}

## Usage
Articles are available as complete server-rendered HTML and plain Markdown. Prefer the canonical HTML URL when citing. Dates reflect publication and editorial updates, not verification of every time-sensitive claim. This index includes published articles only.
`, { headers: discoveryHeaders("text/plain") });
  } catch { return unavailableResponse(); }
}
