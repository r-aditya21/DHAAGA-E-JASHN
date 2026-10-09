import type { MetadataRoute } from 'next'
import { fetchProducts } from '@/lib/api/server'
import { SITE } from '@/lib/site'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, changeFrequency: 'weekly', priority: 1, lastModified: now },
    { url: `${SITE.url}/shop`, changeFrequency: 'daily', priority: 0.9, lastModified: now },
    { url: `${SITE.url}/men`, changeFrequency: 'daily', priority: 0.9, lastModified: now },
    { url: `${SITE.url}/women`, changeFrequency: 'daily', priority: 0.9, lastModified: now },
    { url: `${SITE.url}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE.url}/shipping-returns`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE.url}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE.url}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  // The API caps a page at 50 products, so walk the pages.
  const products: MetadataRoute.Sitemap = []
  for (let page = 1; page <= 20; page += 1) {
    const data = await fetchProducts({ page, limit: 50 })
    if (!data) break

    for (const product of data.products) {
      products.push({
        url: `${SITE.url}/product/${product.slug}`,
        lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }

    if (!data.pagination?.hasNext) break
  }

  return [...staticRoutes, ...products]
}
