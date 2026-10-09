'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProductCard from '@/components/shop/ProductCard'
import Toast from '@/components/ui/Toast'
import BagCountManager from '@/components/ui/BagCountManager'
import QuickViewModal from '@/components/shop/QuickViewModal'
import { getCategoryBySlug, Category } from '@/lib/api/categories'
import { getProducts, Product as APIProduct } from '@/lib/api/products'

export default function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)

  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<APIProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError('')

        const [catRes, prodRes] = await Promise.all([
          getCategoryBySlug(slug),
          getProducts({ category: slug }),
        ])

        setCategory(catRes.category)
        setProducts(prodRes.products || [])
      } catch (err: any) {
        setError(err?.message || 'Category not found')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [slug])

  return (
    <>
      <Navbar />
      <BagCountManager />
      <Toast />

      <main className="shop-page">
        {/* Category Hero */}
        <section className="shop-hero">
          <div className="shop-hero-inner">
            <div className="section-eyebrow shop-eyebrow">
              <div className="eyebrow-line" />
              <span className="eyebrow-text">
                <Link href="/shop" style={{ color: 'inherit' }}>
                  THE COLLECTION
                </Link>
                {' '}/ {category?.name || slug.toUpperCase()}
              </span>
              <div className="eyebrow-line" />
            </div>

            <h1 className="shop-title">
              {category?.name || slug.charAt(0).toUpperCase() + slug.slice(1)}
            </h1>

            {category?.description && (
              <p className="shop-intro">{category.description}</p>
            )}
          </div>
        </section>

        {/* Content */}
        <section className="shop-content">
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
                Loading {slug}...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="shop-empty">
              <span className="shop-empty-eyebrow">NOT FOUND</span>
              <h2>Category not found</h2>
              <p>We couldn&apos;t find this collection. Explore all pieces instead.</p>
              <Link href="/shop" className="btn-primary" style={{ display: 'inline-flex' }}>
                VIEW ALL PIECES
              </Link>
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <div className="products-grid shop-grid">
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

          {!loading && !error && products.length === 0 && (
            <div className="shop-empty">
              <span className="shop-empty-eyebrow">COLLECTION UPDATE</span>
              <h2>No pieces in this edit yet.</h2>
              <p>New handcrafted designs are being added soon.</p>
              <Link href="/shop" className="btn-outline-dark" style={{ display: 'inline-flex' }}>
                EXPLORE OTHER PIECES
              </Link>
            </div>
          )}
        </section>
      </main>

      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />

      <Footer />
    </>
  )
}
