import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { ArrowLeft } from "lucide-react";

import { CopyLink } from "@/components/blog/copy-link";
import { getArticle, getPublished, sortedPosts } from "@/lib/blog/store";
import { articleInfo, jsonLd, slugSchema } from "@/lib/blog/contract";
import {
  categories,
  coverUrl,
  defaultAuthor,
  siteUrl,
} from "@/lib/blog/config";
import { categoryName, formatDate } from "@/lib/blog/format";

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

export default async function Article({ params }: Props) {
  const { meta: p, body } = await article((await params).slug);
  const { toc, minutes } = articleInfo(body);
  const url = siteUrl("/blog/" + p.slug);
  const author = {
    "@type": "Person",
    name: p.author,
    ...(p.author === defaultAuthor() ? { url: siteUrl("/#about") } : {}),
  };
  const { posts } = await getPublished();
  const related = sortedPosts(
    posts.filter(
      (e) => e.meta.slug !== p.slug && e.meta.category === p.category,
    ),
  ).slice(0, 3);
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
  const initials = p.author
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <>
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-28 sm:px-8">
        <article data-article className="min-w-0">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
          />
          <header>
            <nav
              aria-label="Breadcrumb"
              className="text-sm text-muted-foreground"
            >
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
              >
                <ArrowLeft aria-hidden className="size-3.5" /> All articles
              </Link>
              <span aria-hidden> / </span>
              <Link
                href={`/blog?category=${p.category}`}
                className="transition-colors hover:text-primary"
              >
                {categoryName(p.category)}
              </Link>
            </nav>
            <h1 className="mt-6 text-[2.1rem] font-bold leading-[1.12] tracking-tight sm:text-[2.6rem]">
              {p.title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              {p.description}
            </p>
            <div className="mt-7 flex items-center justify-between gap-6 border-y border-border py-4">
              <div className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold text-muted-foreground"
                >
                  {initials}
                </span>
                <div>
                  <p className="font-medium">{p.author}</p>
                  <p className="text-muted-foreground">
                    <time dateTime={p.publishedAt!}>
                      {formatDate(p.publishedAt!, "long")}
                    </time>
                    <span aria-hidden> · </span>
                    {minutes} min read
                  </p>
                </div>
              </div>
              <CopyLink url={url} />
            </div>
            <Image
              src={coverUrl(p.cover.src)}
              alt={p.cover.alt}
              width={1200}
              height={675}
              priority
              className="mt-8 aspect-video w-full rounded-xl object-cover"
              unoptimized
            />
          </header>

          {toc.length >= 3 && (
            <details className="mt-8 rounded-lg border border-border">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
                In this article
              </summary>
              <ol className="space-y-2 px-4 pb-4 text-sm">
                {toc.map((h) => (
                  <li key={h.id} className={h.depth === 3 ? "ml-4" : ""}>
                    <a
                      href={"#" + h.id}
                      className="text-muted-foreground hover:text-primary"
                    >
                      {h.title}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          )}

          <div className="blog-prose mt-10">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSlug]}
              skipHtml
              components={{
                h2: ({ children, id }) => (
                  <h2 id={id}>
                    <a className="heading-anchor" href={"#" + id}>
                      {children}
                    </a>
                  </h2>
                ),
                h3: ({ children, id }) => (
                  <h3 id={id}>
                    <a className="heading-anchor" href={"#" + id}>
                      {children}
                    </a>
                  </h3>
                ),
                img: ({ src, alt }) => {
                  if (typeof src !== "string") return null;
                  return (
                    <Image
                      src={src}
                      alt={alt || ""}
                      width={1200}
                      height={675}
                      className="rounded-lg object-cover"
                      unoptimized
                    />
                  );
                },
                table: ({ children }) => (
                  <div
                    className="table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Article table"
                  >
                    <table>{children}</table>
                  </div>
                ),
              }}
            >
              {body}
            </ReactMarkdown>
          </div>

          <footer className="mt-14">
            {p.updatedAt !== p.publishedAt && (
              <p className="mb-6 text-sm text-muted-foreground">
                Updated{" "}
                <time dateTime={p.updatedAt!}>{formatDate(p.updatedAt!)}</time>
              </p>
            )}
            {p.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {p.tags.map((tag) => (
                  <Link
                    className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    key={tag}
                    href={`/blog?tag=${encodeURIComponent(tag)}`}
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </footer>
        </article>
      </div>

      {related.length > 0 && (
        <section
          aria-label="Related articles"
          className="mx-auto max-w-3xl px-5 pb-24 sm:px-8"
        >
          <div className="border-t border-border pt-10">
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
              More in {categoryName(p.category)}
            </h2>
            <div className="mt-6 grid gap-8 sm:grid-cols-3">
              {related.map(({ meta: r }) => (
                <article key={r.slug} className="group">
                  <Link href={`/blog/${r.slug}`} className="block">
                    <Image
                      src={coverUrl(r.cover.src)}
                      alt={r.cover.alt}
                      width={400}
                      height={260}
                      className="aspect-[3/2] w-full rounded-lg object-cover"
                      unoptimized
                    />
                    <time
                      dateTime={r.publishedAt!}
                      className="mt-3 block text-sm text-muted-foreground"
                    >
                      {formatDate(r.publishedAt!)}
                    </time>
                    <h3 className="mt-1 font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
                      {r.title}
                    </h3>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
