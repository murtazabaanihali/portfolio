import { getPublished, sortedPosts } from "@/lib/blog/store";
import { discoveryHeaders, publishedIndex, unavailableResponse } from "@/lib/blog/discovery";
export const revalidate = 604800; // 7 days (high TTL)
export async function GET() {
  try { return Response.json(publishedIndex(sortedPosts((await getPublished()).posts)), { headers: discoveryHeaders("application/json") }); }
  catch { return unavailableResponse(); }
}
