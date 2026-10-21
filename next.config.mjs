import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Set up Cloudflare development environment bindings if available
initOpenNextCloudflareForDev();

const rawImageDomain = process.env.NEXT_PUBLIC_IMAGE_DOMAIN || "dpg6njrvwhkr5.cloudfront.net";
const imageDomain = rawImageDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: imageDomain,
      },
    ],
  },
  turbopack: {
    rules: {
      "*.md": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    return config;
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
};

export default nextConfig;
