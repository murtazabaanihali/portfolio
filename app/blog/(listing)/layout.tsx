import type { Metadata } from "next";
import { siteUrl } from "@/lib/blog/config";

export const revalidate = 604800;

export const metadata: Metadata = {
  title: "Blog — Notes from building software",
  description:
    "Articles on engineering, building products, and the realities of running software businesses.",
  alternates: {
    canonical: siteUrl("/blog"),
    types: { "application/rss+xml": siteUrl("/blog/rss.xml") },
  },
  openGraph: { title: "Blog", url: siteUrl("/blog"), type: "website" },
};

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
