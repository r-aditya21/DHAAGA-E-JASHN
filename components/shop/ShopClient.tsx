'use client'

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  Suspense,
} from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProductCard from '@/components/shop/ProductCard'
import Toast from '@/components/ui/Toast'
import BagCountManager from '@/components/ui/BagCountManager'
import QuickViewModal from '@/components/shop/QuickViewModal'
import { gsap } from '@/lib/gsapUtils'
import { getProducts, Product as APIProduct } from '@/lib/api/products'
import { getCategories, Category } from '@/lib/api/categories'
import { formatPrice } from '@/lib/format'

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name'

const SORT_OPTIONS: Array<{
  value: SortOption
  label: string
}> = [
  {
    value: 'newest',
    label: 'Newest Arrivals',
  },
  {
    value: 'price_asc',
    label: 'Price: Low to High',
  },
  {
    value: 'price_desc',
    label: 'Price: High to Low',
  },
  {
    value: 'name',
    label: 'Name: A–Z',
  },
]

function ShopContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialCategory = searchParams.get('category') || 'all'
  const initialSearch = searchParams.get('q') || searchParams.get('search') || ''

  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory)
  const [sort, setSort] = useState<SortOption>('newest')
  const [query, setQuery] = useState(initialSearch)
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearch)

  const [products, setProducts] = useState<APIProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null)

  const gridRef = useRef<HTMLDivElement>(null)

  // Sync category param with state
  useEffect(() => {
    const cat = searchParams.get('category') || 'all'
    setSelectedCategory(cat)
  }, [searchParams])

  // Sync search param with state
  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('search') || ''
    setQuery(q)
    setDebouncedQuery(q)
  }, [searchParams])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  // Load categories
  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.categories || []))
      .catch(() => setCategories([]))
  }, [])

  // Fetch products from backend
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const res = await getProducts({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: debouncedQuery.trim() || undefined,
        sort,
      })

      setProducts(res.products || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load products')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, debouncedQuery, sort])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // GSAP animation for grid cards
  useEffect(() => {
    if (!gridRef.current || loading) return

    const cards = gridRef.current.querySelectorAll('.product-card')
    if (cards.length === 0) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (reducedMotion) {
      cards.forEach((card) => {
        ;(card as HTMLElement).style.opacity = '1'
      })
      return
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        cards,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.05,
          ease: 'power3.out',
        }
      )
    }, gridRef)

    return () => context.revert()
  }, [products, loading])

  const handleCategoryChange = (catSlug: string) => {
    setSelectedCategory(catSlug)
    const sp = new URLSearchParams(searchParams.toString())
    if (catSlug === 'all') {
      sp.delete('category')
    } else {
      sp.set('category', catSlug)
    }
    router.replace(`/shop${sp.toString() ? `?${sp.toString()}` : ''}`, { scroll: false })
  }

  const resetFilters = () => {
    setSelectedCategory('all')
    setSort('newest')
    setQuery('')
    router.replace('/shop', { scroll: false })
  }

  return (
    <main className="shop-page">
      <h1 className="sr-only">All pieces</h1>

      {/* SHOP HERO */}
      {/* <section className="shop-hero">
        <div className="shop-hero-inner">
          <div className="section-eyebrow shop-eyebrow">
            <div className="eyebrow-line" />
            <span className="eyebrow-text">THE COLLECTION</span>
            <div className="eyebrow-line" />
          </div>

          <h1 className="shop-title">The Dhaaga Edit</h1>

          <p className="shop-intro">
            Thoughtful Indian silhouettes, quiet details and everyday pieces made for your jashn.
          </p>
        </div>
      </section> */}

      {/* SHOP CONTENT */}
      <section className="shop-content" aria-label="Shop products">
        {/* Toolbar */}
        <div className="shop-toolbar">
          <div className="shop-toolbar-top">
            <div>
              <span className="shop-result-label">CURATED FOR YOU</span>
              <p className="shop-result-count">
                {loading ? 'Searching pieces...' : `${products.length} ${products.length === 1 ? 'piece' : 'pieces'}`}
              </p>
            </div>

            {/* Sort */}
            <label className="shop-sort">
              <span>Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Category Tabs & Search Bar */}
          <div className="shop-controls">
            <div className="shop-collection-tabs" aria-label="Categories">
              <button
                type="button"
                className={`shop-tab ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('all')}
              >
                All pieces
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  className={`shop-tab ${selectedCategory === cat.slug ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(cat.slug)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <label className="shop-search">
              <span className="sr-only">Search products</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-5-5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the collection"
              />
            </label>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: '2px solid rgba(6,34,60,0.15)',
                borderTopColor: '#C99A3D',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#496174' }}>
              Loading collection...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="shop-empty">
            <span className="shop-empty-eyebrow">UNABLE TO LOAD</span>
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <button
              type="button"
              className="btn-outline-dark"
              onClick={fetchProducts}
            >
              RETRY
            </button>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && products.length > 0 && (
          <div ref={gridRef} className="products-grid shop-grid">
            {products.map((product, index) => (
              <ProductCard
                key={product._id}
                product={product}
                index={index}
                onQuickView={setQuickViewProduct}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && products.length === 0 && (
          <div className="shop-empty">
            <span className="shop-empty-eyebrow">NOTHING MATCHED</span>
            <h2>Try another edit.</h2>
            <p>Clear your filters or search for another piece from the collection.</p>
            <button
              type="button"
              className="btn-outline-dark"
              onClick={resetFilters}
            >
              RESET FILTERS
            </button>
          </div>
        )}

        {/* Bottom note */}
        <div className="shop-note">
          <span>CRAFTED FOR EVERYDAY JASHN</span>
          <span>FREE SHIPPING ON ORDERS ABOVE {formatPrice(1499)}</span>
        </div>
      </section>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </main>
  )
}

export default function ShopClient() {
  return (
    <>
      <Navbar />
      <BagCountManager />
      <Toast />
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '100px 0' }}>Loading the collection…</div>}>
        <ShopContent />
      </Suspense>
      <Footer />
    </>
  )
}