'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Toast from '@/components/ui/Toast'
import BagCountManager from '@/components/ui/BagCountManager'
import { KurtaSilhouette } from '@/components/shop/ProductCard'
import { getCart, updateCartItem, removeCartItem, clearCart, CartItem } from '@/lib/api/cart'
import { useAuth } from '@/context/AuthContext'
import { useAuthModal } from '@/context/AuthModalContext'
import { formatPrice } from '@/lib/format'

const FREE_SHIPPING_THRESHOLD = 1499
const SHIPPING_FEE = 150

export default function CartPage() {
  const router = useRouter()
  const { user, loading: authLoading, refreshCart } = useAuth()
  const { openAuth } = useAuthModal()

  const [items, setItems] = useState<CartItem[]>([])
  const [subtotal, setSubtotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadCartData = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await getCart()
      setItems(res.cart?.items || [])
      setSubtotal(res.summary?.subtotal || 0)
    } catch (err: any) {
      setError(err?.message || 'Could not load your shopping bag')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadCartData()
      } else {
        setLoading(false)
      }
    }
  }, [user, authLoading])

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return
    try {
      setUpdatingId(itemId)
      const res = await updateCartItem(itemId, newQty)
      setItems(res.cart?.items || [])
      setSubtotal(res.summary?.subtotal || 0)
      await refreshCart()
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: err?.message || 'Update failed' })
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRemove = async (itemId: string) => {
    try {
      setUpdatingId(itemId)
      const res = await removeCartItem(itemId)
      setItems(res.cart?.items || [])
      setSubtotal(res.summary?.subtotal || 0)
      await refreshCart()
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: 'Item removed from bag' })
      )
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: err?.message || 'Removal failed' })
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const handleClear = async () => {
    if (!confirm('Are you sure you want to empty your shopping bag?')) return
    try {
      setLoading(true)
      await clearCart()
      setItems([])
      setSubtotal(0)
      await refreshCart()
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: 'Shopping bag cleared' })
      )
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: err?.message || 'Clear failed' })
      )
    } finally {
      setLoading(false)
    }
  }

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE
  const total = subtotal + shipping
  const awayFromFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)

  return (
    <>
      <Navbar />
      <BagCountManager />
      <Toast />

      <main style={{ minHeight: '75vh', padding: '48px 24px 100px', maxWidth: 1180, margin: '0 auto' }}>
        {/* Header */}
        {/* <div style={{ textAlign: 'center', marginBottom: 48 }}> */}
          {/* <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          // >
            {/* <div style={{ width: 32, height: 1, background: '#C99A3D', opacity: 0.7 }} />
            <span style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C99A3D', fontWeight: 600 }}>
              YOUR SELECTIONS
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
            Shopping Bag
          </h1>
        </div> */}

        {/* Guest View */}
        {!authLoading && !user && (
          <div className="shop-empty" style={{ margin: '40px auto' }}>
            <span className="shop-empty-eyebrow">SIGN IN TO ACCESS</span>
            <h2>Your bag is waiting for you</h2>
            <p>Please sign in to view your bag, save your selections, and complete your order.</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => openAuth({ message: 'Sign in to view your bag.' })}
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
              Retrieving your bag...
            </p>
          </div>
        )}

        {/* Empty Bag State */}
        {user && !loading && items.length === 0 && (
          <div className="shop-empty" style={{ margin: '40px auto' }}>
            <span className="shop-empty-eyebrow">BAG IS EMPTY</span>
            <h2>No pieces in your bag yet.</h2>
            <p>Explore our handcrafted kurtas and kurtis tailored for everyday celebrations.</p>
            <Link href="/shop" className="btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>
              EXPLORE THE COLLECTION
            </Link>
          </div>
        )}

        {/* Bag Content with Items & Summary */}
        {user && !loading && items.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 48,
              alignItems: 'start',
            }}
          >
            {/* Items Column */}
            <div>
              {/* Free shipping progress bar */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(6,34,60,0.08)',
                  padding: '16px 20px',
                  marginBottom: 24,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#06223C', marginBottom: 8, fontWeight: 500 }}>
                  {awayFromFreeShipping > 0 ? (
                    <span>Add {formatPrice(awayFromFreeShipping)} more to enjoy <strong>FREE SHIPPING</strong></span>
                  ) : (
                    <span style={{ color: '#2E7D32', fontWeight: 600 }}>🎉 You have qualified for <strong>FREE SHIPPING</strong>!</span>
                  )}
                  <span>Threshold: {formatPrice(FREE_SHIPPING_THRESHOLD)}</span>
                </div>
                <div style={{ height: 6, background: '#E8DFD1', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%`,
                      background: '#C99A3D',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {items.map((item) => {
                  const prod = item.product
                  if (!prod) return null
                  const isBusy = updatingId === item._id

                  return (
                    <div
                      key={item._id}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid rgba(6,34,60,0.08)',
                        padding: '20px',
                        display: 'grid',
                        gridTemplateColumns: '90px 1fr auto',
                        gap: 20,
                        alignItems: 'center',
                        opacity: isBusy ? 0.6 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {/* Image Thumbnail */}
                      <Link
                        href={`/product/${prod.slug}`}
                        style={{
                          width: 90,
                          height: 110,
                          background: '#E8DFD1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {prod.images && prod.images.length > 0 && prod.images[0].startsWith('http') ? (
                          <Image
                            src={prod.images[0]}
                            alt={prod.name}
                            fill
                            sizes="90px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <KurtaSilhouette color="#E8DFD1" />
                        )}
                      </Link>

                      {/* Info & Variant */}
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#06223C', marginBottom: 4 }}>
                          <Link href={`/product/${prod.slug}`} style={{ color: 'inherit' }}>
                            {prod.name}
                          </Link>
                        </h3>
                        <p style={{ fontSize: 13, color: '#496174', marginBottom: 8 }}>
                          Size: <strong>{item.size}</strong> &nbsp;·&nbsp; Color: <strong>{item.color}</strong>
                        </p>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#06223C' }}>
                          {formatPrice(prod.price)}
                        </p>
                      </div>

                      {/* Quantity & Delete */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            border: '1px solid rgba(6,34,60,0.2)',
                            background: '#F8F5EF',
                          }}
                        >
                          <button
                            type="button"
                            disabled={item.quantity <= 1 || isBusy}
                            onClick={() => handleUpdateQuantity(item._id, item.quantity - 1)}
                            style={{ width: 32, height: 32, fontSize: 16, color: '#06223C' }}
                          >
                            −
                          </button>
                          <span style={{ minWidth: 28, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#06223C' }}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleUpdateQuantity(item._id, item.quantity + 1)}
                            style={{ width: 32, height: 32, fontSize: 16, color: '#06223C' }}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRemove(item._id)}
                          style={{
                            fontSize: 11,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: '#A33',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Actions row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <Link
                  href="/shop"
                  style={{
                    fontSize: 12,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#06223C',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  ← Continue Shopping
                </Link>
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    fontSize: 12,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#A33',
                    fontWeight: 500,
                  }}
                >
                  Clear Entire Bag
                </button>
              </div>
            </div>

            {/* Order Summary Column */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(6,34,60,0.1)',
                padding: '36px 28px',
                boxShadow: '0 12px 32px rgba(6,34,60,0.04)',
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                  fontSize: '1.8rem',
                  color: '#06223C',
                  marginBottom: 20,
                  fontWeight: 500,
                }}
              >
                Order Summary
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14, color: '#2b2b2b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Shipping Estimate</span>
                  <span>{shipping === 0 ? <strong style={{ color: '#2E7D32' }}>FREE</strong> : formatPrice(shipping)}</span>
                </div>

                <hr style={{ border: 'none', height: 1, background: 'rgba(6,34,60,0.08)', margin: '6px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, color: '#06223C' }}>
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/checkout')}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  marginTop: 28,
                  padding: '16px',
                  fontSize: 12,
                  letterSpacing: '0.2em',
                }}
              >
                PROCEED TO CHECKOUT
              </button>

              <div style={{ marginTop: 24, fontSize: 12, color: '#496174', textAlign: 'center', lineHeight: 1.6 }}>
                ✓ Cash on Delivery available at checkout<br />
                ✓ Verified server-side pricing &amp; stock reservation
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}
