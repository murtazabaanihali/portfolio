import { getArticle } from "@/lib/blog/store";
import { slugSchema } from "@/lib/blog/contract";
import { siteUrl } from "@/lib/blog/config";
import { discoveryHeaders, unavailableResponse } from "@/lib/blog/discovery";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) return new Response("Not found", { status: 404, headers: discoveryHeaders("text/plain") });
  try {
    const post = await getArticle(slug);
    if (!post) return new Response("Not found", { status: 404, headers: discoveryHeaders("text/plain") });
    return new Response(post.raw, { headers: { ...discoveryHeaders("text/markdown"),
      Link: `<${siteUrl("/blog/" + slug)}>; rel="canonical"`, "X-Robots-Tag": "noindex, follow" } });
  } catch { return unavailableResponse(); }
}
