import type { Metadata } from "next";
import Link from "next/link";
import { categories, coverUrl, siteUrl } from "@/lib/blog/config";
import { getPublished, sortedPosts } from "@/lib/blog/store";

export const dynamic = "force-dynamic";
type Query = { q?: string; category?: string; tag?: string; page?: string };
export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }): Promise<Metadata> {
  const p = await searchParams;
  return {
    title: "Blog — Engineering, AI & building products",
    description: "Practical articles on software engineering, AI agents, building products, and life as a solo founder.",
    alternates: { canonical: siteUrl("/blog"), types: { "application/rss+xml": siteUrl("/blog/rss.xml") } },
    robots: p.q || p.category || p.tag || p.page ? { index: false, follow: true } : undefined,
    openGraph: { title: "Blog", url: siteUrl("/blog"), type: "website" },
  };
}
export default async function Blog({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const { posts } = await getPublished();
  const q = (query.q || "").slice(0, 200).toLowerCase();
  const filtered = sortedPosts(posts).filter(({ meta: p }) =>
    (!query.category || p.category === query.category) && (!query.tag || p.tags.includes(query.tag)) &&
    (!q || [p.title, p.description, p.author, categories.find(c => c.slug === p.category)?.name, ...p.tags].join(" ").toLowerCase().includes(q)));
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const page = Math.min(pages, Math.max(1, Number.parseInt(query.page || "1", 10) || 1));
  const pageUrl = (n: number) => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.category) params.set("category", query.category);
    if (query.tag) params.set("tag", query.tag);
    params.set("page", String(n));
    return "/blog?" + params;
  };
  return <main className="mx-auto max-w-4xl px-5 pb-24 pt-32">
    <header className="mb-10"><p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">Notes from the work</p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Building things. Sharing what helps.</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted-foreground">Engineering, AI, thoughtful products, and the decisions behind them.</p>
      <div className="mt-5 flex gap-5 text-sm text-primary"><a href="/blog/rss.xml">RSS feed</a><a href="/blog/index.json">Content index</a></div>
    </header>
    <form action="/blog" method="get" role="search" className="mb-6 flex flex-wrap gap-3">
      <label className="flex min-w-48 flex-1 flex-col gap-2 text-sm">Search articles
        <input name="q" defaultValue={query.q} maxLength={200} placeholder="Title, topic, or technology…" className="rounded-lg border bg-background px-4 py-3" />
      </label>
      <label className="flex flex-col gap-2 text-sm">Category
        <select name="category" defaultValue={query.category || ""} className="rounded-lg border bg-background px-4 py-3">
          <option value="">All categories</option>{categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </label>
      {query.tag && <input type="hidden" name="tag" value={query.tag} />}
      <button type="submit" className="self-end rounded-lg bg-primary px-5 py-3 text-primary-foreground">Search</button>
    </form>
    <nav aria-label="Blog categories" className="mb-8 flex flex-wrap gap-2 text-sm">
      <Link href="/blog" className="rounded-full border px-3 py-2">All articles</Link>
      {categories.filter(c => posts.some(p => p.meta.category === c.slug)).map(c => <Link className="rounded-full border px-3 py-2 hover:border-primary" key={c.slug} href={`/blog?category=${c.slug}`}>{c.name}</Link>)}
    </nav>
    {query.tag && <p className="mb-5 text-muted-foreground">Tagged “{query.tag}” · <Link href="/blog" className="text-primary">Clear filters</Link></p>}
    {filtered.length === 0 ? <section className="rounded-2xl border p-8"><h2 className="text-xl font-semibold">{posts.length ? "No matching articles" : "Good things take a little writing."}</h2><p className="mt-3 text-muted-foreground">{posts.length ? "Try a different search or browse all articles." : "Articles are on the way. Subscribe to the RSS feed to follow along."}</p></section> :
      <ol className="divide-y">{filtered.slice((page - 1) * 12, page * 12).map(({ meta: p }) => <li key={p.slug} className="py-7">
        <article className="flex items-start gap-5">
          <div className="min-w-0 flex-1">
            <Link className="text-sm font-medium text-primary" href={`/blog?category=${p.category}`}>{categories.find(c => c.slug === p.category)?.name}</Link>
            <h2 className="mt-2 text-2xl font-semibold leading-tight"><Link href={`/blog/${p.slug}`} className="hover:text-primary">{p.title}</Link></h2>
            <p className="mt-3 text-muted-foreground">{p.description}</p>
            <p className="mt-4 text-sm text-muted-foreground">{p.author} · <time dateTime={p.publishedAt!}>{new Date(p.publishedAt!).toLocaleDateString("en", { dateStyle: "medium", timeZone: "UTC" })}</time></p>
          </div>
          {/* Public CDN images bypass Next image cache so no extra freshness TTL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl(p.cover.src)} alt={p.cover.alt} width={144} height={96} loading="lazy" className="mt-2 hidden aspect-[3/2] w-28 rounded-xl object-cover sm:block sm:w-36" />
        </article>
      </li>)}</ol>}
    {pages > 1 && <nav aria-label="Pagination" className="mt-8 flex items-center justify-between">
      {page > 1 ? <Link href={pageUrl(page - 1)}>← Previous</Link> : <span />}
      <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
      {page < pages ? <Link href={pageUrl(page + 1)}>Next →</Link> : <span />}
    </nav>}
  </main>;
}
