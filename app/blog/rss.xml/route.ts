import { getPublished, sortedPosts } from "@/lib/blog/store";
import { discoveryHeaders, rss, unavailableResponse } from "@/lib/blog/discovery";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return new Response(rss(sortedPosts((await getPublished()).posts)), { headers: discoveryHeaders("application/rss+xml") }); }
  catch { return unavailableResponse(); }
}
