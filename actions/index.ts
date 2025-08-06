"use server";

import { getProjectBySlugDB, getProjectsDB } from "@/lib/db/queries";
import { ProjectTag } from "@/lib/db/schema";
import { sendContactMail } from "@/lib/resend";

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
        const projects = await getProjectsDB(Math.max(1, pageNumber), tag, 12);
        return { projects, more: projects?.length >= 12 };
    } catch (error) {
        console.log("Error getting projects ", error);
        return null;
    }
};

export const getProjectBySlug = async (slug: string) => {
    try {
        return await getProjectBySlugDB(slug);
    } catch (error) {
        console.log("Error getting project by slug ", error);
        return null;
    }
};
