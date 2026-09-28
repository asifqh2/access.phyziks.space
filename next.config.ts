import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  images: {
    remotePatterns: [
      // Cloudflare CDN (video thumbnails, user-uploaded images)
      {
        protocol: 'https',
        hostname: 'cdn.phyziks.space',
      },
      // Backblaze B2 public bucket
      {
        protocol: 'https',
        hostname: '*.backblazeb2.com',
      },
      // Clerk user avatars
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
};

export default nextConfig;
