import Link from "next/link";
export default function NotFound() { return <main className="mx-auto max-w-3xl px-5 pb-24 pt-32"><h1 className="text-3xl font-bold">Article not found</h1><p className="my-5 text-muted-foreground">This article may have been unpublished, or the link is incorrect.</p><Link href="/blog" className="text-primary">Browse all articles →</Link></main>; }
