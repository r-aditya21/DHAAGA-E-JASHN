'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProductCard from '@/components/shop/ProductCard'
import Toast from '@/components/ui/Toast'
import BagCountManager from '@/components/ui/BagCountManager'
import { getWishlist, clearWishlist } from '@/lib/api/wishlist'
import { Product as APIProduct } from '@/lib/api/products'
import { useAuth } from '@/context/AuthContext'
import { useAuthModal } from '@/context/AuthModalContext'

export default function WishlistPage() {
  const { user, loading: authLoading, refreshWishlist } = useAuth()
  const { openAuth } = useAuthModal()
  const [products, setProducts] = useState<APIProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadWishlistData = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await getWishlist()
      setProducts(res.wishlist?.products || [])
    } catch (err: any) {
      setError(err?.message || 'Could not load your wishlist')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadWishlistData()
      } else {
        setLoading(false)
      }
    }
  }, [user, authLoading])

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear your saved wishlist?')) return
    try {
      setLoading(true)
      await clearWishlist()
      setProducts([])
      await refreshWishlist()
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: 'Wishlist cleared' })
      )
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: err?.message || 'Clear failed' })
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <BagCountManager />
      <Toast />

      <main style={{ minHeight: '75vh', padding: '48px 24px 100px', maxWidth: 1240, margin: '0 auto' }}>
        {/* Header */}
        {/* <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ width: 32, height: 1, background: '#C99A3D', opacity: 0.7 }} />
            <span style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C99A3D', fontWeight: 600 }}>
              SAVED EDIT
            </span>
            <div style={{ width: 32, height: 1, background: '#C99A3D', opacity: 0.7 }} />
          </div>

          <h1
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontSize: '2.8rem',
              color: '#06223C',
              fontWeight: 500,
            }}
          >
            Your Wishlist
          </h1>
        </div> */}

        {/* Guest View */}
        {!authLoading && !user && (
          <div className="shop-empty" style={{ margin: '40px auto' }}>
            <span className="shop-empty-eyebrow">SIGN IN TO ACCESS</span>
            <h2>Save your favorite silhouettes</h2>
            <p>Please sign in to view and manage your personal collection wishlist.</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => openAuth({ message: 'Sign in to see your wishlist.' })}
              >
                SIGN IN
              </button>
              <Link href="/shop" className="btn-outline-dark">
                EXPLORE COLLECTION
              </Link>
            </div>
          </div>
        )}

        {/* Logged in Loading */}
        {user && loading && (
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
              Retrieving saved pieces...
            </p>
          </div>
        )}

        {/* Empty Wishlist */}
        {user && !loading && products.length === 0 && (
          <div className="shop-empty" style={{ margin: '40px auto' }}>
            <span className="shop-empty-eyebrow">NOTHING SAVED YET</span>
            <h2>Your wishlist is quiet.</h2>
            <p>Save pieces you love while browsing to return to them whenever you wish.</p>
            <Link href="/shop" className="btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>
              DISCOVER PIECES
            </Link>
          </div>
        )}

        {/* Wishlist Grid */}
        {user && !loading && products.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <p style={{ fontSize: 14, color: '#496174' }}>
                {products.length} {products.length === 1 ? 'saved piece' : 'saved pieces'}
              </p>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  fontSize: 12,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#A33',
                  fontWeight: 500,
                  textDecoration: 'underline',
                }}
              >
                Clear Wishlist
              </button>
            </div>

            <div className="products-grid shop-grid">
              {products.map((product, index) => (
                <ProductCard key={product._id} product={product} index={index} />
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}
