import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-28 sm:px-8">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        Article not found
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        This article may have been unpublished, or the link is incorrect.
      </p>
      <Link
        href="/blog"
        className="mt-8 inline-block text-sm font-medium text-primary hover:underline"
      >
        Browse all articles →
      </Link>
    </main>
  );
}
