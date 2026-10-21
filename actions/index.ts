"use server";

import { headers } from "next/headers";

import { ProjectTag } from "@/lib/db/schema";
import { sendContactMail } from "@/lib/resend";
import { getProjectBySlugDB, getProjectsDB } from "@/lib/db/queries";
import { checkEmailRateLimit, getClientIp } from "@/lib/ratelimit";
import { withRedisCache, isDynamicServerError } from "@/lib/cache";

export const contactMe = async (form: FormData) => {
    try {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const name = form.get("name")?.toString().trim();
        const email = form.get("email")?.toString().trim();
        const subject = form.get("subject")?.toString().trim();
        const message = form.get("message")?.toString().trim();

        if (!name) return { error: "Please enter valid name." };
        if (!email || !emailRegex.test(email))
            return { error: "Please enter valid email." };
        if (!subject) return { error: "Please enter valid subject." };
        if (!message) return { error: "Please enter valid message." };

        const headerList = await headers();
        const ip = getClientIp(headerList);
        const identifier = ip !== "127.0.0.1" ? ip : `${ip}:${email}`;

        const rateLimit = await checkEmailRateLimit(`portfolio:limit:${identifier}`);
        if (!rateLimit.success) {
            return {
                error: rateLimit.error || "Too many emails sent. Please try again later.",
            };
        }

        await sendContactMail({ name, email, subject, message });
        return {
            success: "Thank you for your message. I'll get back to you soon!",
        };
    } catch (error) {
        console.log("Error contacting me", error);
        return { error: "Failed to send message. Please try again later or contact directly." };
    }
};

export const getProjects = async (pageNumber: number = 1, tag?: ProjectTag) => {
    try {
        const page = Math.max(1, pageNumber);
        const cacheKey = `cache:projects:${page}:${tag || "all"}`;
        const ttl = 3 * 3600; // 3 hours

        return await withRedisCache(cacheKey, ttl, async () => {
            const projects = await getProjectsDB(page, tag, 12);
            return { projects, more: projects?.length >= 12 };
        });
    } catch (error) {
        if (isDynamicServerError(error)) throw error;
        console.log("Error getting projects ", error);
        return { projects: [], more: false };
    }
};

export const getProjectBySlug = async (slug: string) => {
    try {
        const cacheKey = `cache:project:${slug}`;
        const ttl = 3 * 3600; // 3 hours

        return await withRedisCache(cacheKey, ttl, async () => {
            return getProjectBySlugDB(slug);
        });
    } catch (error) {
        if (isDynamicServerError(error)) throw error;
        console.log("Error getting project by slug ", error);
        return null;
    }
};
