"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useArticle, useRelatedPosts } from "@/swr/blog";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { ArrowLeft } from "lucide-react";

import { ArticleSkeleton } from "@/components/blog/article-skeleton";
import { CopyLink } from "@/components/blog/copy-link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { coverUrl, siteUrl } from "@/lib/blog/config";
import { categoryName, formatDate } from "@/lib/blog/format";

export default function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: article, error } = useArticle(slug);
  const { data: related = [], isLoading: loadingRelated } = useRelatedPosts(slug, article?.post.category);
  if (error) throw error;
  if (article === null) notFound();
  if (!article) return <ArticleSkeleton />;
  const { post: p, body, toc, minutes } = article;
  const url = siteUrl("/blog/" + p.slug);
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
            <h1 className="mt-6 font-serif text-[2.1rem] font-bold leading-[1.12] tracking-tight sm:text-[2.6rem]">
              {p.title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              {p.description}
            </p>
            <div className="mt-7 flex items-center justify-between gap-6 border-y border-border py-4">
              <div className="flex items-center gap-3 text-sm">
                <Avatar className="size-9 font-mono text-xs font-semibold">
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
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
            <Card className="mt-8">
              <details className="group">
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
            </Card>
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
                  <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                      #{tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </footer>
        </article>
      </div>

      {loadingRelated && <p role="status" className="mx-auto max-w-3xl px-5 pb-24 text-muted-foreground">Loading related articles…</p>}
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
              {related.map((r) => (
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
                    <h3 className="mt-1 font-serif font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
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
