import { categories } from "./config";

export const formatDate = (iso: string, style: "long" | "medium" = "medium") =>
  new Date(iso).toLocaleDateString("en", { dateStyle: style, timeZone: "UTC" });

export const categoryName = (slug: string) =>
  categories.find(c => c.slug === slug)?.name ?? slug;

export const postIndex = (n: number) => String(n).padStart(2, "0");
