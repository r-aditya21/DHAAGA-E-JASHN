import type { NextConfig } from 'next'

// Product and category images are admin-supplied URLs, so remote images must be
// allowed for next/image. Lock this down to your image host(s) with
// NEXT_PUBLIC_IMAGE_HOSTS="res.cloudinary.com,images.example.com" in production.
const hosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean)

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      ...(hosts.length > 0
        ? hosts.map((hostname) => ({ protocol: 'https' as const, hostname }))
        : [{ protocol: 'https' as const, hostname: '**' }]),
      { protocol: 'http' as const, hostname: 'localhost' },
    ],
  },
  poweredByHeader: false,
}

export default nextConfig
