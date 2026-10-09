// Server-side data fetching for server components, metadata and the sitemap.
// Public catalogue data only — never sends cookies.
import { API_BASE } from '@/lib/site'
import type { Product, ProductsResponse } from './products'
import type { Category } from './categories'

async function serverFetch<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function fetchProducts(params: {
  category?: string
  gender?: 'men' | 'women'
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name'
  page?: number
  limit?: number
} = {}): Promise<ProductsResponse | null> {
  const qs = new URLSearchParams()
  if (params.category) qs.set('category', params.category)
  if (params.gender) qs.set('gender', params.gender)
  if (params.sort) qs.set('sort', params.sort)
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  const q = qs.toString()
  return serverFetch<ProductsResponse>(`/products${q ? `?${q}` : ''}`)
}

// `missing` is true only when the API answered 404, so a temporary outage is
// never reported to search engines as a deleted page.
export async function fetchProduct(
  slug: string
): Promise<{ product: Product | null; missing: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/products/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    })
    if (res.status === 404) return { product: null, missing: true }
    if (!res.ok) return { product: null, missing: false }
    const data = (await res.json()) as { product: Product }
    return { product: data.product ?? null, missing: !data.product }
  } catch {
    return { product: null, missing: false }
  }
}

export async function fetchCategory(slug: string): Promise<Category | null> {
  const data = await serverFetch<{ category: Category }>(`/categories/${encodeURIComponent(slug)}`)
  return data?.category ?? null
}
