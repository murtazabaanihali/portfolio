/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                hostname: String(
                    process.env.NEXT_PUBLIC_IMAGE_DOMAIN
                ).startsWith("https://")
                    ? String(process.env.NEXT_PUBLIC_IMAGE_DOMAIN).replace(
                          "https://",
                          ""
                      )
                    : process.env.NEXT_PUBLIC_IMAGE_DOMAIN,
            },
        ],
    },
    async rewrites() {
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
