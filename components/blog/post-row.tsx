import Link from "next/link";

import { coverUrl } from "@/lib/blog/config";
import { categoryName, formatDate } from "@/lib/blog/format";
import type { Post } from "@/lib/blog/contract";

export function PostRow({ post }: { post: Post }) {
  return (
    <li className="group border-b border-border/60 py-4 sm:py-6 last:border-b-0">
      <Link href={`/blog/${post.slug}`} className="block">
        <article className="flex items-start gap-3.5 sm:gap-6">
          {/* Public CDN images bypass Next image cache so no extra freshness TTL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl(post.cover.src)}
            alt=""
            width={160}
            height={160}
            loading="lazy"
            aria-hidden
            className="size-16 shrink-0 rounded-lg object-cover transition-transform duration-200 group-hover:scale-105 sm:size-24"
          />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground sm:text-sm">
              <span className="font-medium text-foreground/80">
                {categoryName(post.category)}
              </span>
              {post.publishedAt && (
                <>
                  <span aria-hidden>·</span>
                  <time dateTime={post.publishedAt}>
                    {formatDate(post.publishedAt)}
                  </time>
                </>
              )}
            </p>
            <h3 className="mt-1 font-serif text-base font-bold leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-xl">
              {post.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:mt-1.5 sm:text-sm">
              {post.description}
            </p>
          </div>
        </article>
      </Link>
    </li>
  );
}
