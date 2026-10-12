declare global {
    interface Window {
        umami?: {
            track: {
                (eventName: string, eventData?: Record<string, any>): void;
                (customFn: (props: Record<string, any>) => Record<string, any>): void;
            };
        };
    }
}

export {};
