import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const getImageFullURL = (url?: string, fallback?: string) => {
    if (!url) return fallback || "/placeholder.svg";
    if (url?.startsWith?.("https://")) return url;

    const imgDomain = process.env.NEXT_PUBLIC_IMAGE_DOMAIN;
    if (!imgDomain) {
        console.error("Cannot load actual image");
        return fallback || "/placeholder.svg";
    }

    return `${imgDomain}/portfolio${url?.startsWith?.("/") ? "" : "/"}${url}`;
};
