import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private, per-person pages have nothing for search engines.
        disallow: ['/admin', '/account', '/cart', '/checkout', '/order/', '/wishlist', '/login', '/register'],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  }
}
