import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticle } from "@/lib/blog/store";
import { jsonLd, slugSchema } from "@/lib/blog/contract";
import { categories, coverUrl, defaultAuthor, siteUrl } from "@/lib/blog/config";

export const revalidate = 604800; // 7 days (high TTL)
type Props = { params: Promise<{ slug: string }> };

async function article(slug: string) {
  if (!slugSchema.safeParse(slug).success) notFound();
  const post = await getArticle(slug);
  if (!post) notFound();
  return post;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { meta: p } = await article((await params).slug);
  const url = siteUrl("/blog/" + p.slug),
    image = { url: coverUrl(p.cover.src), alt: p.cover.alt };
  return {
    title: p.title,
    description: p.description,
    authors: [{ name: p.author }],
    keywords: p.tags,
    alternates: { canonical: url, types: { "text/markdown": url + "/raw.md" } },
    openGraph: {
      type: "article",
      title: p.title,
      description: p.description,
      url,
      publishedTime: p.publishedAt!,
      modifiedTime: p.updatedAt!,
      authors: [p.author],
      section: categories.find((c) => c.slug === p.category)?.name,
      tags: p.tags,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: p.title,
      description: p.description,
      images: [image],
    },
  };
}

export default async function ArticleLayout({ params, children }: Props & { children: React.ReactNode }) {
  const { meta: p } = await article((await params).slug);
  const url = siteUrl("/blog/" + p.slug);
  const author = {
    "@type": "Person",
    name: p.author,
    ...(p.author === defaultAuthor() ? { url: siteUrl("/#about") } : {}),
  };
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": url + "#article",
        headline: p.title,
        description: p.description,
        mainEntityOfPage: url,
        url,
        image: coverUrl(p.cover.src),
        author,
        datePublished: p.publishedAt,
        dateModified: p.updatedAt,
        inLanguage: "en",
        articleSection: categories.find((c) => c.slug === p.category)?.name,
        keywords: p.tags.join(", "),
        isAccessibleForFree: true,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: siteUrl("/blog"),
          },
          { "@type": "ListItem", position: 3, name: p.title, item: url },
        ],
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
      {children}
    </>
  );
}
