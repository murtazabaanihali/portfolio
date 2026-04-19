"use server";

import { unstable_cache } from "next/cache";

import { ProjectTag } from "@/lib/db/schema";
import { sendContactMail } from "@/lib/resend";
import { getProjectBySlugDB, getProjectsDB } from "@/lib/db/queries";

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

        await sendContactMail({ name, email, subject, message });
        return {
            success: "Thank you for your message. I'll get back to you soon!",
        };
    } catch (error) {
        console.log("Error contacting me", error);
        return { error: "Internal server error!" };
    }
};

export const getProjects = async (pageNumber: number = 1, tag?: ProjectTag) => {
    try {
        return await unstable_cache(
            async (pageNumber: number, tag: ProjectTag | undefined) => {
                const projects = await getProjectsDB(
                    Math.max(1, pageNumber),
                    tag,
                    12,
                );
                return { projects, more: projects?.length >= 12 };
            },
            ["projects"],
            { revalidate: 3 * 3600, tags: ["projects"] },
        )(pageNumber, tag);
    } catch (error) {
        console.log("Error getting projects ", error);
        return { projects: [], more: false };
    }
};

export const getProjectBySlug = async (slug: string) => {
    try {
        return await unstable_cache(
            async (slug: string) => getProjectBySlugDB(slug),
            ["project-by-slug"],
            { revalidate: 3 * 3600, tags: ["projects"] },
        )(slug);
    } catch (error) {
        console.log("Error getting project by slug ", error);
        return null;
    }
};
