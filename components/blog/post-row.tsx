import Link from "next/link";

import { coverUrl } from "@/lib/blog/config";
import { categoryName, formatDate } from "@/lib/blog/format";
import type { Post } from "@/lib/blog/contract";

export function PostRow({ post }: { post: Post }) {
  return (
    <li className="group border-b border-border last:border-b-0">
      <article className="flex items-start gap-4 py-6 sm:gap-6 sm:py-8">
        {/* Public CDN images bypass Next image cache so no extra freshness TTL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverUrl(post.cover.src)}
          alt=""
          width={240}
          height={160}
          loading="lazy"
          aria-hidden
          className="hidden aspect-[3/2] w-28 shrink-0 rounded-md object-cover sm:block sm:w-32 lg:w-36"
        />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
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
          </p>
          <h2 className="mt-1.5 text-xl font-semibold leading-snug tracking-tight">
            <Link
              href={`/blog/${post.slug}`}
              className="transition-colors group-hover:text-primary"
            >
              {post.title}
            </Link>
          </h2>
          <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:line-clamp-none sm:text-[15px]">
            {post.description}
          </p>
        </div>
      </article>
    </li>
  );
}
