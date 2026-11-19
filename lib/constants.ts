export const EMAIL_RATE_LIMITS = {
    HOURLY: {
        limit: 4,
        windowSeconds: 60 * 60, // 1 hour (3600 seconds)
        description: "4 emails per hour",
    },
    DAILY: {
        limit: 10,
        windowSeconds: 24 * 60 * 60, // 1 day (86400 seconds)
        description: "10 emails per day",
    },
} as const;

export const EMAIL_LIMIT_HOURLY = EMAIL_RATE_LIMITS.HOURLY.limit;
export const EMAIL_WINDOW_HOURLY_SECONDS = EMAIL_RATE_LIMITS.HOURLY.windowSeconds;

export const EMAIL_LIMIT_DAILY = EMAIL_RATE_LIMITS.DAILY.limit;
export const EMAIL_WINDOW_DAILY_SECONDS = EMAIL_RATE_LIMITS.DAILY.windowSeconds;

// Blog Pagination & Cache Constants
export const BLOG_PAGE_SIZE = 11;
export const BLOG_CACHE_TTL = 7 * 24 * 3600; // 7 days (604800 seconds) - high TTL
export const BLOG_SEARCH_CACHE_TTL = 5 * 60; // 5 minutes (300 seconds) - small time cache for search
export const BLOG_SEARCH_DEBOUNCE_MS = 300; // 300ms debounce for client-side search

// Redis Cache Keys
export const BLOG_CACHE_KEYS = {
    list: (page: number, limit: number, category = "all", tag = "all") =>
        `cache:blogs:${page}:${limit}:${category}:${tag}`,
    search: (query: string, page: number, limit: number, category = "all", tag = "all") =>
        `cache:blogs:search:${query.toLowerCase().trim()}:${page}:${limit}:${category}:${tag}`,
    bySlug: (slug: string) => `cache:blog:${slug}`,
    related: (slug: string, category: string) => `cache:blog:related:${slug}:${category}`,
    categoriesCount: "cache:blog:categories-count",
    sitemap: "cache:blog:sitemap",
} as const;
