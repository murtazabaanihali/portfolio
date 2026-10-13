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
