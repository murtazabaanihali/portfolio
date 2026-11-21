import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { coverUrl } from "@/lib/blog/config";
import { categoryName, formatDate } from "@/lib/blog/format";
import type { Post } from "@/lib/blog/contract";

export function FeaturedPost({ post }: { post: Post }) {
  return (
    <article className="group">
      <Link href={`/blog/${post.slug}`} className="block">
        <Card className="overflow-hidden transition-colors hover:border-foreground/30">
          <div className="grid md:grid-cols-2">
            <div className="relative aspect-[16/10] bg-muted sm:aspect-[16/9] md:aspect-auto md:min-h-[300px]">
              {/* Public CDN images bypass Next image cache so no extra freshness TTL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl(post.cover.src)}
                alt={post.cover.alt}
                width={880}
                height={560}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <div className="flex flex-col justify-center p-5 sm:p-7 md:p-10">
              <div>
                <Badge variant="secondary" className="mb-2.5 sm:mb-3">
                  Latest
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground sm:text-sm">
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
              </div>
              <h2 className="mt-2.5 font-serif text-xl font-bold leading-snug tracking-tight sm:mt-3 sm:text-2xl md:text-3xl">
                {post.title}
              </h2>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:mt-3 sm:line-clamp-3 sm:text-sm md:text-base">
                {post.description}
              </p>
            </div>
          </div>
        </Card>
      </Link>
    </article>
  );
}
