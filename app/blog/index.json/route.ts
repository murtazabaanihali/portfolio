import { getPublished, sortedPosts } from "@/lib/blog/store";
import { discoveryHeaders, publishedIndex, unavailableResponse } from "@/lib/blog/discovery";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(publishedIndex(sortedPosts((await getPublished()).posts)), { headers: discoveryHeaders("application/json") }); }
  catch { return unavailableResponse(); }
}
