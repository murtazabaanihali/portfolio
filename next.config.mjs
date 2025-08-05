/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
        {
            hostname: String(process.env.NEXT_PUBLIC_IMAGE_DOMAIN).startsWith("https://")
            ? String(process.env.NEXT_PUBLIC_IMAGE_DOMAIN).replace("https://", "")
            : process.env.NEXT_PUBLIC_IMAGE_DOMAIN
        }
    ]
  },
}

export default nextConfig
