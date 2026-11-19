import { getPublished, sortedPosts } from "@/lib/blog/store";
import {
    discoveryHeaders,
    rss,
    unavailableResponse,
} from "@/lib/blog/discovery";
export const revalidate = 604800; // 7 days (high TTL)
export async function GET() {
    try {
        return new Response(rss(sortedPosts((await getPublished()).posts)), {
            headers: discoveryHeaders("application/rss+xml"),
        });
    } catch {
        return unavailableResponse();
    }
}
