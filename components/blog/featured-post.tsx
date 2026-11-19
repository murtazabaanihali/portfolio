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
            <div className="relative aspect-[16/10] bg-muted md:aspect-auto md:min-h-[320px]">
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
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <div>
                <Badge variant="secondary" className="mb-3">
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
              <h2 className="mt-3 font-serif text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                {post.title}
              </h2>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {post.description}
              </p>
            </div>
          </div>
        </Card>
      </Link>
    </article>
  );
}
