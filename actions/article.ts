"use server";

import { articleInfo, slugSchema } from "@/lib/blog/contract";
import { getArticle } from "@/lib/blog/store";

export async function getArticleContent(slug: string) {
    if (!slugSchema.safeParse(slug).success) return null;
    const article = await getArticle(slug);
    if (!article) return null;
    return { post: article.meta, body: article.body, ...articleInfo(article.body) };
}
