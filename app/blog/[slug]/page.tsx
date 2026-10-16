import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { getArticle } from "@/lib/blog/store";
import { articleInfo, jsonLd, slugSchema } from "@/lib/blog/contract";
import { categories, coverUrl, defaultAuthor, siteUrl } from "@/lib/blog/config";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
async function article(slug: string) {
  if (!slugSchema.safeParse(slug).success) notFound();
  const post = await getArticle(slug);
  if (!post) notFound();
  return post;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { meta: p } = await article((await params).slug);
  const url = siteUrl("/blog/" + p.slug), image = { url: coverUrl(p.cover.src), alt: p.cover.alt };
  return {
    title: p.title, description: p.description, authors: [{ name: p.author }],
    keywords: p.tags,
    alternates: { canonical: url, types: { "text/markdown": url + "/raw.md" } },
    openGraph: { type: "article", title: p.title, description: p.description, url,
      publishedTime: p.publishedAt!, modifiedTime: p.updatedAt!, authors: [p.author],
      section: categories.find(c => c.slug === p.category)?.name, tags: p.tags, images: [image] },
    twitter: { card: "summary_large_image", title: p.title, description: p.description, images: [image] },
  };
}
export default async function Article({ params }: Props) {
  const { meta: p, body } = await article((await params).slug);
  const { toc, minutes } = articleInfo(body);
  const url = siteUrl("/blog/" + p.slug);
  const author = { "@type": "Person", name: p.author, ...(p.author === defaultAuthor() ? { url: siteUrl("/#about") } : {}) };
  const data = {
    "@context": "https://schema.org", "@graph": [
      { "@type": "BlogPosting", "@id": url + "#article", headline: p.title, description: p.description,
        mainEntityOfPage: url, url, image: coverUrl(p.cover.src), author,
        datePublished: p.publishedAt, dateModified: p.updatedAt, inLanguage: "en",
        articleSection: categories.find(c => c.slug === p.category)?.name, keywords: p.tags.join(", "),
        isAccessibleForFree: true },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
        { "@type": "ListItem", position: 2, name: "Blog", item: siteUrl("/blog") },
        { "@type": "ListItem", position: 3, name: p.title, item: url },
      ] },
    ],
  };
  return <main className="mx-auto max-w-3xl px-5 pb-24 pt-32">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
    <article>
      <header>
        <nav aria-label="Breadcrumb" className="mb-7 text-sm text-muted-foreground"><Link href="/">Home</Link> / <Link href="/blog">Blog</Link></nav>
        <Link className="text-sm font-medium uppercase tracking-widest text-primary" href={`/blog?category=${p.category}`}>{categories.find(c => c.slug === p.category)?.name}</Link>
        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{p.title}</h1>
        <p className="mt-5 text-xl leading-relaxed text-muted-foreground">{p.description}</p>
        <div className="my-6 flex flex-wrap gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <span>{p.author}</span><span aria-hidden>·</span><time dateTime={p.publishedAt!}>{new Date(p.publishedAt!).toLocaleDateString("en", { dateStyle: "long", timeZone: "UTC" })}</time><span>· {minutes} min read</span>
          {p.updatedAt !== p.publishedAt && <span>Updated <time dateTime={p.updatedAt!}>{new Date(p.updatedAt!).toLocaleDateString("en", { dateStyle: "medium", timeZone: "UTC" })}</time></span>}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverUrl(p.cover.src)} alt={p.cover.alt} width={1200} height={675} fetchPriority="high" className="mb-8 aspect-video w-full rounded-2xl object-cover" />
      </header>
      {toc.length >= 4 && <nav aria-label="Table of contents" className="mb-10 border-y py-6"><h2 className="mb-3 font-semibold">In this article</h2><ol className="space-y-2 text-sm">{toc.map(h => <li key={h.id} className={h.depth === 3 ? "ml-4" : ""}><a href={"#" + h.id} className="text-muted-foreground hover:text-primary">{h.title}</a></li>)}</ol></nav>}
      <div className="blog-prose"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} skipHtml components={{
        h2: ({ children, id }) => <h2 id={id}><a className="heading-anchor" href={"#" + id}>{children}</a></h2>,
        h3: ({ children, id }) => <h3 id={id}><a className="heading-anchor" href={"#" + id}>{children}</a></h3>,
        // eslint-disable-next-line @next/next/no-img-element
        img: ({ src, alt }) => <img src={src} alt={alt || ""} loading="lazy" />,
        table: ({ children }) => <div className="table-scroll" tabIndex={0} role="region" aria-label="Article table"><table>{children}</table></div>,
      }}>{body}</ReactMarkdown></div>
      <footer className="mt-12 border-t pt-6"><div className="flex flex-wrap gap-2">{p.tags.map(tag => <Link className="rounded-full border px-3 py-1 text-sm text-muted-foreground" key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>)}</div>
        <div className="mt-6 flex gap-5 text-sm text-primary"><Link href="/blog">← All articles</Link><a href={`/blog/${p.slug}/raw.md`}>Read as Markdown</a></div>
      </footer>
    </article>
  </main>;
}
