'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import ProductCard, { KurtaSilhouette, AnyProduct } from '@/components/shop/ProductCard'
import QuickViewModal from '@/components/shop/QuickViewModal'
import Toast from '@/components/ui/Toast'
import BagCountManager from '@/components/ui/BagCountManager'
import { getProducts, Product, PaginationMeta } from '@/lib/api/products'
import { colorToHex } from '@/lib/colors'
import type { CollectionConfig } from '@/lib/collections'
import './collection.css'

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name'

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'newest', label: 'Newest arrivals' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name: A to Z' },
]

const PAGE_SIZE = 24

interface CollectionViewProps {
  config: CollectionConfig
  initialProducts: Product[]
  initialPagination: PaginationMeta | null
  /** True when the server could not reach the API. */
  loadFailed?: boolean
}

export default function CollectionView({
  config,
  initialProducts,
  initialPagination,
  loadFailed = false,
}: CollectionViewProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [pagination, setPagination] = useState<PaginationMeta | null>(initialPagination)
  const [sort, setSort] = useState<SortOption>('newest')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(loadFailed ? 'We could not load the collection. Please try again.' : '')
  const [quickViewProduct, setQuickViewProduct] = useState<AnyProduct | null>(null)

  // Ignore responses from a sort that has since been replaced.
  const requestRef = useRef(0)

  const total = pagination?.total ?? products.length

  const load = useCallback(
    async (nextSort: SortOption, page: number, append: boolean) => {
      const requestId = ++requestRef.current
      setLoading(true)
      setError('')

      try {
        const res = await getProducts({
          gender: config.key,
          sort: nextSort,
          page,
          limit: PAGE_SIZE,
        })

        if (requestId !== requestRef.current) return

        setProducts((prev) => (append ? [...prev, ...(res.products || [])] : res.products || []))
        setPagination(res.pagination)
      } catch (err) {
        if (requestId !== requestRef.current) return
        setError(err instanceof Error ? err.message : 'We could not load the collection.')
      } finally {
        if (requestId === requestRef.current) setLoading(false)
      }
    },
    [config.key]
  )

  const handleSort = (value: SortOption) => {
    setSort(value)
    load(value, 1, false)
  }

  // Colours that actually exist in this section, from real variant data.
  const colours = useMemo(() => {
    const seen = new Map<string, string>()
    for (const product of products) {
      for (const variant of product.variants || []) {
        const key = variant.color.trim().toLowerCase()
        if (key && !seen.has(key)) seen.set(key, variant.color.trim())
      }
    }
    return Array.from(seen.values()).slice(0, 6)
  }, [products])

  return (
    <main className={`col-page col-page--${config.key}`}>
      <BagCountManager />
      <Toast />

      {/* ---------- Hero ---------- */}
      <section className="col-hero" aria-labelledby="col-title">
        <div className="col-hero-copy">
          <h1 id="col-title" className="col-title">
            {config.title}
          </h1>
          <p className="col-intro">{config.intro}</p>

          <nav className="col-switch" aria-label="Sections">
            <span className="col-switch-current" aria-current="page">
              {config.key === 'men' ? 'Men' : 'Women'}
            </span>
            <Link href={config.other.href}>{config.other.label}</Link>
            <Link href="/shop">All pieces</Link>
          </nav>
        </div>

        <div
          className={`col-panel ${config.panelDark ? 'is-dark' : 'is-light'}`}
          style={{ background: config.panelColor }}
          aria-hidden={colours.length === 0 ? true : undefined}
        >
          <svg className="col-corner" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d="M2 26 L2 2 L26 2" stroke="#C99A3D" strokeWidth="1" opacity="0.7" />
          </svg>

          <div className="col-silhouette" aria-hidden="true">
            <KurtaSilhouette color={config.panelColor} />
          </div>

          {colours.length > 0 && (
            <div className="col-colours">
              <span className="col-colours-label">Colours in this section</span>
              <ul>
                {colours.map((name) => (
                  <li key={name}>
                    <span className="col-dot" style={{ background: colorToHex(name) }} aria-hidden="true" />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Grid ---------- */}
      <section className="col-content" aria-label={config.title}>
        <div className="col-toolbar">
          <p className="col-count" aria-live="polite">
            {loading && products.length === 0
              ? 'Loading pieces…'
              : `${total} ${total === 1 ? 'piece' : 'pieces'}`}
          </p>

          <label className="col-sort">
            <span>Sort by</span>
            <select value={sort} onChange={(e) => handleSort(e.target.value as SortOption)} disabled={loading}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div className="col-notice" role="alert">
            <p>{error}</p>
            <button type="button" className="btn-outline-dark" onClick={() => load(sort, 1, false)}>
              Try again
            </button>
          </div>
        )}

        {!error && products.length > 0 && (
          <div className="products-grid col-grid" style={{ opacity: loading ? 0.55 : 1 }}>
            {products.map((product, index) => (
              <ProductCard
                key={product._id}
                product={product}
                index={index % PAGE_SIZE}
                onQuickView={setQuickViewProduct}
              />
            ))}
          </div>
        )}

        {!error && !loading && products.length === 0 && (
          <div className="col-notice">
            <h2>Nothing here yet</h2>
            <p>New pieces are being added. In the meantime, see everything in the store.</p>
            <Link href="/shop" className="btn-outline-dark">
              View all pieces
            </Link>
          </div>
        )}

        {pagination?.hasNext && !error && (
          <div className="col-more-wrap">
            <button
              type="button"
              className="btn-outline-dark"
              disabled={loading}
              onClick={() => load(sort, (pagination?.page ?? 1) + 1, true)}
            >
              {loading ? 'Loading…' : 'Show more'}
            </button>
          </div>
        )}
      </section>

      {/* ---------- Keep exploring ---------- */}
      <section className="col-explore" aria-label="Keep exploring">
        <h2>Keep exploring</h2>
        <ul>
          <li>
            <Link href={config.other.href}>{config.other.label}</Link>
          </li>
          <li>
            <Link href="/shop?category=everyday">Everyday</Link>
          </li>
          <li>
            <Link href="/shop?category=festive">Festive</Link>
          </li>
        </ul>
      </section>

      <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </main>
  )
}
