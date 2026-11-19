import Link from "next/link";

import { coverUrl } from "@/lib/blog/config";
import { categoryName, formatDate } from "@/lib/blog/format";
import type { Post } from "@/lib/blog/contract";

export function FeaturedPost({ post }: { post: Post }) {
  return (
    <article className="group border-b border-border pb-10">
      <Link href={`/blog/${post.slug}`} className="block">
        {/* Public CDN images bypass Next image cache so no extra freshness TTL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverUrl(post.cover.src)}
          alt={post.cover.alt}
          width={880}
          height={560}
          className="aspect-[3/2] w-full rounded-xl object-cover"
        />
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link
          href={`/blog?category=${post.category}`}
          className="font-medium text-foreground/80 transition-colors hover:text-foreground"
        >
          {categoryName(post.category)}
        </Link>
        <span aria-hidden>·</span>
        <time dateTime={post.publishedAt!}>
          {formatDate(post.publishedAt!)}
        </time>
      </div>
      <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
        <Link
          href={`/blog/${post.slug}`}
          className="transition-colors group-hover:text-primary"
        >
          {post.title}
        </Link>
      </h2>
      <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
        {post.description}
      </p>
    </article>
  );
}
