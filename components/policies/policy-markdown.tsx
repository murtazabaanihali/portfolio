import React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import { ExternalLink, Hash } from "lucide-react";

import { cn } from "@/lib/utils";

interface PolicyMarkdownProps {
  content: string;
}

export function PolicyMarkdown({ content }: PolicyMarkdownProps) {
  return (
    <div className="policy-prose text-foreground">
      <ReactMarkdown
        rehypePlugins={[rehypeSlug]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent mb-6 pb-2">
              {children}
            </h1>
          ),
          h2: ({ id, children }) => (
            <h2
              id={id}
              className="scroll-mt-28 text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-12 mb-4 pb-2 border-b border-border flex items-center justify-between group"
            >
              <span>{children}</span>
              {id && (
                <a
                  href={`#${id}`}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity text-sm ml-2 p-1 rounded hover:bg-muted"
                  aria-label="Link to this section"
                  title="Copy direct section anchor"
                >
                  <Hash className="h-4 w-4" />
                </a>
              )}
            </h2>
          ),
          h3: ({ id, children }) => (
            <h3
              id={id}
              className="scroll-mt-28 text-xl sm:text-2xl font-semibold tracking-tight text-foreground mt-8 mb-3 flex items-center justify-between group"
            >
              <span>{children}</span>
              {id && (
                <a
                  href={`#${id}`}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity text-xs ml-2 p-1 rounded hover:bg-muted"
                  aria-label="Link to this section"
                >
                  <Hash className="h-3.5 w-3.5" />
                </a>
              )}
            </h3>
          ),
          h4: ({ id, children }) => (
            <h4
              id={id}
              className="scroll-mt-28 text-lg font-semibold text-foreground mt-6 mb-2"
            >
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-muted-foreground leading-relaxed my-4 text-base [&:not(:first-child)]:mt-4">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-4 ml-6 list-disc space-y-2 text-muted-foreground marker:text-primary">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-6 list-decimal space-y-2 text-muted-foreground marker:text-primary marker:font-medium">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary bg-primary/5 rounded-r-lg px-4 py-3 my-5 italic text-foreground/90 shadow-sm">
              {children}
            </blockquote>
          ),
          code: ({ className, children, node, ...props }: any) => {
            const isCodeBlock = /language-/.test(className || "");
            if (isCodeBlock) {
              return (
                <code className={className}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className={cn(
                  "rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] font-medium text-foreground border border-border/60",
                  className
                )}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="p-4 rounded-lg bg-muted/80 overflow-x-auto border border-border font-mono text-sm my-4 text-foreground">
              {children}
            </pre>
          ),
          hr: () => <hr className="my-8 border-border" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          a: ({ href, children }) => {
            let targetHref = href || "";
            // Rewrite internal markdown links to proper routes
            if (
              targetHref === "./privacy-policy.md" ||
              targetHref === "privacy-policy.md"
            ) {
              targetHref = "/privacy";
            } else if (
              targetHref === "./terms-of-service.md" ||
              targetHref === "terms-of-service.md"
            ) {
              targetHref = "/terms";
            }

            const isHash = targetHref.startsWith("#");
            const isExternal =
              targetHref.startsWith("http://") ||
              targetHref.startsWith("https://");

            if (isHash) {
              return (
                <a
                  href={targetHref}
                  className="text-primary hover:text-primary/80 font-medium underline underline-offset-4 transition-colors"
                >
                  {children}
                </a>
              );
            }

            if (isExternal) {
              return (
                <a
                  href={targetHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 font-medium underline underline-offset-4 transition-colors inline-flex items-center gap-1"
                >
                  <span>{children}</span>
                  <ExternalLink className="h-3 w-3 inline shrink-0 opacity-70" />
                </a>
              );
            }

            return (
              <Link
                href={targetHref}
                className="text-primary hover:text-primary/80 font-medium underline underline-offset-4 transition-colors"
              >
                {children}
              </Link>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
