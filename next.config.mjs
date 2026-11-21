import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Set up Cloudflare development environment bindings if available
initOpenNextCloudflareForDev();

const rawImageDomain = process.env.NEXT_PUBLIC_MEDIA_CDN_DOMAIN || "dpg6njrvwhkr5.cloudfront.net";
const imageDomain = rawImageDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Local tooling stays in Git, but must not be copied into the Worker build.
  outputFileTracingExcludes: {
    "/*": ["./tools/**/*"],
  },
  images: {
    remotePatterns: [
      {
        hostname: imageDomain,
      },
    ],
  },
  async rewrites() {
    if (!process.env.ANALYTICS_URL) return [];
    return [
      {
        source: "/tk.js",
        destination: `${process.env.ANALYTICS_URL}/x.js`,
      },
      {
        source: "/api/send",
        destination: `${process.env.ANALYTICS_URL}/api/send`,
      },
    ];
  },
  async headers() {
    return [
      // Layout metadata is shared; filtered listing URLs should not be indexed.
      ...["q", "category", "tag", "page"].map((key) => ({
        source: "/blog",
        has: [{ type: "query", key, value: ".+" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      })),
      {
        source: "/blog/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/blog",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/llms.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
