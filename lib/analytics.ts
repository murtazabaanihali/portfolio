/**
 * Safely track an event using Umami analytics.
 * If Umami is not loaded, blocked (e.g. by ad blockers), or errors out,
 * this function fails silently without throwing errors or interrupting application functionality.
 */
export function trackUmamiEvent(
    eventName: string,
    eventData?: Record<string, any>
) {
    try {
        if (typeof window !== "undefined" && typeof window.umami?.track === "function") {
            window.umami.track(eventName, eventData);
        }
    } catch (error) {
        // Analytics failure should never break user interaction or email submission
        console.warn("Umami tracking failed:", error);
    }
}
