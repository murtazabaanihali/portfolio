import "server-only";
import { getRedisClient } from "@/lib/ratelimit";

export function isDynamicServerError(err: unknown): boolean {
    if (typeof err !== "object" || err === null) return false;
    return (
        (err as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE" ||
        (err as { $$typeof?: symbol }).$$typeof === Symbol.for("react.postpone")
    );
}

/**
 * Cache an expensive database query or remote fetch using Upstash Redis.
 * Falls back gracefully to the fetcher if Redis is not configured or encounters an error.
 *
 * @param key Cache key (e.g., "cache:projects:1:all")
 * @param ttlSeconds Time-to-live in seconds (e.g., 3 * 3600 for 3 hours)
 * @param fetcher Async function that retrieves the fresh data
 */
export async function withRedisCache<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
): Promise<T> {
    const client = getRedisClient();

    if (client) {
        try {
            const cached = await client.get<T>(key);
            if (cached !== null && cached !== undefined) {
                return cached;
            }
        } catch (error) {
            if (isDynamicServerError(error)) throw error;
            console.warn(`Redis cache get error for key "${key}":`, error);
        }
    }

    const fresh = await fetcher();

    if (client && fresh !== null && fresh !== undefined) {
        try {
            await client.set(key, fresh, { ex: ttlSeconds });
        } catch (error) {
            if (isDynamicServerError(error)) throw error;
            console.warn(`Redis cache set error for key "${key}":`, error);
        }
    }

    return fresh;
}

/**
 * Delete one or more keys from Redis cache.
 */
export async function invalidateRedisCache(keys: string | string[]): Promise<void> {
    const client = getRedisClient();
    if (!client) return;

    try {
        const keyList = Array.isArray(keys) ? keys : [keys];
        if (keyList.length > 0) {
            await client.del(...keyList);
        }
    } catch (error) {
        console.warn("Redis cache invalidation error:", error);
    }
}
