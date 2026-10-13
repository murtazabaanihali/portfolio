import { Redis } from "@upstash/redis";
import { EMAIL_RATE_LIMITS } from "@/lib/constants";

let redis: Redis | null = null;

export const getRedisClient = (): Redis | null => {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        return null;
    }

    if (!redis) {
        redis = new Redis({
            url,
            token,
        });
    }

    return redis;
};

export function formatTtl(seconds: number): string {
    if (seconds <= 0) return "shortly";
    if (seconds < 60) {
        return `in ${seconds} second${seconds > 1 ? "s" : ""}`;
    }
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
        return `in ${minutes} minute${minutes > 1 ? "s" : ""}`;
    }
    const hours = Math.ceil(seconds / 3600);
    return `in ${hours} hour${hours > 1 ? "s" : ""}`;
}

export type RateLimitResult = {
    success: boolean;
    error?: string;
    remaining?: number;
    resetInSeconds?: number;
};

async function incrementAndCheck(
    client: Redis,
    key: string,
    limit: number,
    windowSeconds: number
): Promise<{ success: boolean; current: number; ttl: number }> {
    const pipe = client.pipeline();
    pipe.incr(key);
    pipe.ttl(key);
    const [current, rawTtl] = await pipe.exec<[number, number]>();

    let ttl = rawTtl;
    // On the first request or if TTL was not set, set expiration
    if (current === 1 || rawTtl === -1) {
        await client.expire(key, windowSeconds);
        ttl = windowSeconds;
    }

    return {
        success: current <= limit,
        current,
        ttl: ttl > 0 ? ttl : windowSeconds,
    };
}

export async function checkEmailRateLimit(identifier: string): Promise<RateLimitResult> {
    const client = getRedisClient();

    if (!client) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(
                "Upstash Redis environment variables are not configured. Rate limiting skipped."
            );
        }
        return { success: true };
    }

    const hourlyKey = `ratelimit:email:hourly:${identifier}`;
    const dailyKey = `ratelimit:email:daily:${identifier}`;

    try {
        // 1. Check if daily limit was already reached (to avoid consuming hourly quota)
        const dailyCount = await client.get<number>(dailyKey);
        if (dailyCount !== null && dailyCount >= EMAIL_RATE_LIMITS.DAILY.limit) {
            const dailyTtl = await client.ttl(dailyKey);
            const timeStr = formatTtl(dailyTtl > 0 ? dailyTtl : EMAIL_RATE_LIMITS.DAILY.windowSeconds);
            return {
                success: false,
                error: `Daily rate limit reached (${EMAIL_RATE_LIMITS.DAILY.limit} emails/day). Please try again ${timeStr}.`,
                remaining: 0,
                resetInSeconds: dailyTtl > 0 ? dailyTtl : EMAIL_RATE_LIMITS.DAILY.windowSeconds,
            };
        }

        // 2. Increment and check hourly limit (4 emails / hour)
        const hourly = await incrementAndCheck(
            client,
            hourlyKey,
            EMAIL_RATE_LIMITS.HOURLY.limit,
            EMAIL_RATE_LIMITS.HOURLY.windowSeconds
        );

        if (!hourly.success) {
            const timeStr = formatTtl(hourly.ttl);
            return {
                success: false,
                error: `Hourly rate limit reached (${EMAIL_RATE_LIMITS.HOURLY.limit} emails/hour). Please try again ${timeStr}.`,
                remaining: 0,
                resetInSeconds: hourly.ttl,
            };
        }

        // 3. Increment and check daily limit (10 emails / day)
        const daily = await incrementAndCheck(
            client,
            dailyKey,
            EMAIL_RATE_LIMITS.DAILY.limit,
            EMAIL_RATE_LIMITS.DAILY.windowSeconds
        );

        if (!daily.success) {
            const timeStr = formatTtl(daily.ttl);
            return {
                success: false,
                error: `Daily rate limit reached (${EMAIL_RATE_LIMITS.DAILY.limit} emails/day). Please try again ${timeStr}.`,
                remaining: 0,
                resetInSeconds: daily.ttl,
            };
        }

        const hourlyRemaining = Math.max(0, EMAIL_RATE_LIMITS.HOURLY.limit - hourly.current);
        const dailyRemaining = Math.max(0, EMAIL_RATE_LIMITS.DAILY.limit - daily.current);

        return {
            success: true,
            remaining: Math.min(hourlyRemaining, dailyRemaining),
            resetInSeconds: hourly.ttl,
        };
    } catch (error) {
        console.error("Error evaluating rate limit via Upstash Redis:", error);
        // Fail open to avoid blocking legitimate messages during Redis network blips
        return { success: true };
    }
}

export function getClientIp(headerList: Headers): string {
    const cfConnectingIp = headerList.get("cf-connecting-ip");
    if (cfConnectingIp) return cfConnectingIp.trim();

    const xForwardedFor = headerList.get("x-forwarded-for");
    if (xForwardedFor) {
        const ip = xForwardedFor.split(",")[0]?.trim();
        if (ip) return ip;
    }

    const xRealIp = headerList.get("x-real-ip");
    if (xRealIp) return xRealIp.trim();

    return "127.0.0.1";
}
