'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProductCard, { KurtaSilhouette } from '@/components/shop/ProductCard'
import Toast from '@/components/ui/Toast'
import BagCountManager from '@/components/ui/BagCountManager'
import { getProductBySlug, getProducts, Product as APIProduct } from '@/lib/api/products'
import { getProductReviews, createReview, Review } from '@/lib/api/reviews'
import { getMyOrders } from '@/lib/api/orders'
import { addToCart } from '@/lib/api/cart'
import { addToWishlist, removeFromWishlist } from '@/lib/api/wishlist'
import { useAuth } from '@/context/AuthContext'
import { useAuthModal } from '@/context/AuthModalContext'
import { formatPrice } from '@/lib/format'

const COLOR_HEX_MAP: Record<string, string> = {
  ivory: '#EFE8DA',
  navy: '#06223C',
  'sand beige': '#D8C6AA',
  beige: '#D8C6AA',
  'classic beige': '#D8C6AA',
  charcoal: '#2b2b2b',
  'deep charcoal': '#222',
  'heritage navy': '#0d3558',
  slate: '#496174',
  'muted slate': '#496174',
  'midnight blue': '#0a2c4d',
  'midnight navy': '#06223C',
}

export default function ProductDetail({
  slug,
  initialProduct = null,
}: {
  slug: string
  /** Product rendered on the server; skips the first client fetch. */
  initialProduct?: APIProduct | null
}) {
  const { user, wishlistIds, refreshWishlist, refreshCart } = useAuth()
  const { openAuth } = useAuthModal()

  const [product, setProduct] = useState<APIProduct | null>(initialProduct)
  const [relatedProducts, setRelatedProducts] = useState<APIProduct[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewSummary, setReviewSummary] = useState({ count: 0, averageRating: 0 })
  const [loading, setLoading] = useState(!initialProduct)
  const [error, setError] = useState('')

  // Variant selection
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)

  // Review form
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [eligibleOrders, setEligibleOrders] = useState<Array<{ orderId: string; orderNumber: string }>>([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')

  useEffect(() => {
    async function loadProductData() {
      try {
        if (!initialProduct) setLoading(true)
        setError('')

        // The server already fetched this product when it rendered the page.
        const p =
          initialProduct && initialProduct.slug === slug
            ? initialProduct
            : (await getProductBySlug(slug)).product
        setProduct(p)

        if (p.variants && p.variants.length > 0) {
          const firstInStock = p.variants.find((v) => v.stock > 0) || p.variants[0]
          setSelectedSize(firstInStock.size)
          setSelectedColor(firstInStock.color)
        }

        // Fetch related products
        const catSlug = typeof p.category === 'object' ? p.category.slug : undefined
        if (catSlug) {
          getProducts({ category: catSlug, limit: 4 })
            .then((r) => setRelatedProducts(r.products.filter((item) => item._id !== p._id)))
            .catch(() => {})
        }

        // Fetch reviews
        getProductReviews(p._id)
          .then((r) => {
            setReviews(r.reviews || [])
            setReviewSummary(r.summary || { count: 0, averageRating: 0 })
          })
          .catch(() => {})
      } catch (err: any) {
        setError(err?.message || 'Product not found')
      } finally {
        setLoading(false)
      }
    }

    loadProductData()
  }, [slug, initialProduct])

  // Check if current user has delivered order with this product to allow review
  useEffect(() => {
    if (!user || !product) {
      setEligibleOrders([])
      return
    }

    getMyOrders()
      .then((res) => {
        const deliveredWithProduct = (res.orders || []).filter(
          (o) =>
            o.orderStatus === 'delivered' &&
            o.items.some((item) => item.product === product._id || (item.product as any)?._id === product._id)
        )
        const mapped = deliveredWithProduct.map((o) => ({
          orderId: o._id,
          orderNumber: o.orderNumber,
        }))
        setEligibleOrders(mapped)
        if (mapped.length > 0) {
          setSelectedOrderId(mapped[0].orderId)
        }
      })
      .catch(() => {})
  }, [user, product])

  const isWishlisted = product ? wishlistIds.includes(product._id) : false

  // Selected variant stock
  const currentVariant = product?.variants?.find(
    (v) => v.size === selectedSize && v.color.toLowerCase() === selectedColor.toLowerCase()
  )

  const isOutOfStock = !currentVariant || currentVariant.stock <= 0
  const maxStock = currentVariant?.stock || 0

  const handleWishlistToggle = async () => {
    if (!user) {
      openAuth({ message: 'Sign in to save pieces to your wishlist.' })
      return
    }

    if (!product) return

    try {
      if (isWishlisted) {
        await removeFromWishlist(product._id)
        window.dispatchEvent(
          new CustomEvent('dhaaga:toast', { detail: 'Removed from wishlist' })
        )
      } else {
        await addToWishlist(product._id)
        window.dispatchEvent(
          new CustomEvent('dhaaga:toast', { detail: 'Added to wishlist ♥' })
        )
      }
      await refreshWishlist()
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: err?.message || 'Wishlist update failed' })
      )
    }
  }

  const handleAddToCart = async () => {
    if (!user) {
      openAuth({ message: 'Sign in to add pieces to your bag.' })
      return
    }

    if (!product || !selectedSize || !selectedColor) {
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: 'Please select a size and color' })
      )
      return
    }

    if (isOutOfStock) {
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: 'Selected variant is currently out of stock' })
      )
      return
    }

    try {
      setAddingToCart(true)
      await addToCart({
        productId: product._id,
        size: selectedSize,
        color: selectedColor,
        quantity,
      })
      await refreshCart()
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', {
          detail: `Added ${product.name} (${selectedSize} / ${selectedColor}) to your bag ✓`,
        })
      )
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', {
          detail: err?.message || 'Failed to add item to bag',
        })
      )
    } finally {
      setAddingToCart(false)
    }
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product || !selectedOrderId) return

    try {
      setSubmittingReview(true)
      setReviewError('')
      setReviewSuccess('')

      const res = await createReview({
        productId: product._id,
        orderId: selectedOrderId,
        rating,
        comment: comment.trim(),
      })

      setReviewSuccess('Thank you! Your review has been published.')
      setComment('')
      // Refresh reviews
      const updated = await getProductReviews(product._id)
      setReviews(updated.reviews || [])
      setReviewSummary(updated.summary || { count: 0, averageRating: 0 })
      setTimeout(() => {
        setShowReviewModal(false)
        setReviewSuccess('')
      }, 1500)
    } catch (err: any) {
      setReviewError(err?.message || 'Could not submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  const mainColorHex =
    COLOR_HEX_MAP[selectedColor.toLowerCase()] ||
    COLOR_HEX_MAP[product?.variants?.[0]?.color.toLowerCase() || ''] ||
    '#EFE8DA'

  const availableSizes = product?.variants
    ? Array.from(new Set(product.variants.map((v) => v.size)))
    : []

  const availableColors = product?.variants
    ? Array.from(new Set(product.variants.map((v) => v.color)))
    : []

  return (
    <>
      <Navbar />
      <BagCountManager />
      <Toast />

      <main style={{ minHeight: '80vh', padding: '40px 24px 100px', maxWidth: 1240, margin: '0 auto' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: 32, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#496174' }}>
          <Link href="/" style={{ color: 'inherit' }}>Home</Link>
          {' '}/ <Link href="/shop" style={{ color: 'inherit' }}>Collection</Link>
          {product && typeof product.category === 'object' && (
            <>
              {' '}/ <Link href={`/category/${product.category.slug}`} style={{ color: 'inherit' }}>{product.category.name}</Link>
            </>
          )}
          {' '}/ <span style={{ color: '#06223C', fontWeight: 600 }}>{product?.name || slug}</span>
        </nav>

        {loading && (
          <div style={{ padding: '120px 0', textAlign: 'center' }}>
            <div
              style={{
                width: 40,
                height: 40,
                border: '2px solid rgba(6,34,60,0.15)',
                borderTopColor: '#C99A3D',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#496174' }}>
              Unfolding the silhouette...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="shop-empty" style={{ margin: '80px auto' }}>
            <span className="shop-empty-eyebrow">PIECE UNAVAILABLE</span>
            <h2>Product Not Found</h2>
            <p>{error}</p>
            <Link href="/shop" className="btn-primary" style={{ display: 'inline-flex' }}>
              RETURN TO SHOP
            </Link>
          </div>
        )}

        {!loading && product && (
          <>
            {/* Product Details Section */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 56,
                alignItems: 'start',
                marginBottom: 80,
              }}
            >
              {/* Product Visual / Gallery */}
              <div
                style={{
                  background: mainColorHex,
                  aspectRatio: '3/4',
                  minHeight: 460,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  border: '1px solid rgba(6,34,60,0.06)',
                  boxShadow: '0 8px 32px rgba(6,34,60,0.06)',
                }}
              >
                {product.images && product.images.length > 0 && product.images[0].startsWith('http') ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    priority
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '80%', height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <KurtaSilhouette color={mainColorHex} />
                  </div>
                )}

                {/* Wishlist floating button */}
                <button
                  type="button"
                  onClick={handleWishlistToggle}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#F8F5EF',
                    boxShadow: '0 4px 16px rgba(6,34,60,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(6,34,60,0.08)',
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill={isWishlisted ? '#C99A3D' : 'none'}
                    stroke={isWishlisted ? '#C99A3D' : '#06223C'}
                    strokeWidth="1.6"
                  >
                    <path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z" />
                  </svg>
                </button>
              </div>

              {/* Product Info & Purchase Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Category & Title */}
                <div>
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: '#C99A3D',
                      fontWeight: 600,
                      display: 'block',
                      marginBottom: 8,
                    }}
                  >
                    {typeof product.category === 'object' ? product.category.name : 'Dhaaga Handcrafted'}
                  </span>
                  <h1
                    style={{
                      fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                      fontSize: '2.8rem',
                      color: '#06223C',
                      fontWeight: 500,
                      lineHeight: 1.1,
                      marginBottom: 12,
                    }}
                  >
                    {product.name}
                  </h1>
                  <p style={{ fontSize: '1.5rem', fontWeight: 600, color: '#06223C' }}>
                    {formatPrice(product.price)}
                  </p>
                  <span style={{ fontSize: 12, color: '#496174' }}>Inclusive of all taxes · Free shipping &gt; ₹1499</span>
                </div>

                {/* Star rating summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', color: '#C99A3D', fontSize: 16 }}>
                    {'★'.repeat(Math.round(reviewSummary.averageRating) || 5)}
                    {'☆'.repeat(5 - (Math.round(reviewSummary.averageRating) || 5))}
                  </div>
                  <span style={{ fontSize: 13, color: '#496174' }}>
                    {reviewSummary.averageRating > 0 ? reviewSummary.averageRating.toFixed(1) : '5.0'} ({reviewSummary.count} {reviewSummary.count === 1 ? 'review' : 'reviews'})
                  </span>
                </div>

                <hr style={{ border: 'none', height: 1, background: 'rgba(6,34,60,0.08)' }} />

                {/* Description */}
                <p style={{ fontSize: 15, lineHeight: 1.8, color: '#2b2b2b' }}>
                  {product.description}
                </p>

                {/* Color Selector */}
                {availableColors.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600 }}>
                        Color: <span style={{ fontWeight: 400, color: '#496174' }}>{selectedColor}</span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {availableColors.map((col) => {
                        const hex = COLOR_HEX_MAP[col.toLowerCase()] || '#EFE8DA'
                        const isSelected = selectedColor.toLowerCase() === col.toLowerCase()
                        return (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setSelectedColor(col)}
                            title={col}
                            aria-label={`Select color ${col}`}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: hex,
                              border: isSelected ? '2px solid #06223C' : '1px solid rgba(6,34,60,0.2)',
                              boxShadow: isSelected ? '0 0 0 2px #C99A3D' : 'none',
                              cursor: 'pointer',
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Size Selector */}
                {availableSizes.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600 }}>
                        Select Size
                      </span>
                      <span style={{ fontSize: 12, color: '#496174', cursor: 'pointer', textDecoration: 'underline' }}>
                        Size Guide
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {availableSizes.map((sz) => {
                        const variantMatch = product.variants?.find(
                          (v) => v.size === sz && (!selectedColor || v.color.toLowerCase() === selectedColor.toLowerCase())
                        )
                        const inStock = variantMatch ? variantMatch.stock > 0 : true
                        const isSelected = selectedSize === sz

                        return (
                          <button
                            key={sz}
                            type="button"
                            disabled={!inStock}
                            onClick={() => setSelectedSize(sz)}
                            style={{
                              width: 52,
                              height: 48,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isSelected ? '#06223C' : '#FFFFFF',
                              color: isSelected ? '#F8F5EF' : inStock ? '#06223C' : '#AAA',
                              border: isSelected ? '1px solid #06223C' : '1px solid rgba(6,34,60,0.2)',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: inStock ? 'pointer' : 'not-allowed',
                              textDecoration: inStock ? 'none' : 'line-through',
                              opacity: inStock ? 1 : 0.5,
                            }}
                          >
                            {sz}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Stock availability indicator */}
                <div>
                  {isOutOfStock ? (
                    <span style={{ fontSize: 13, color: '#C33', fontWeight: 600 }}>
                      ● Currently Out of Stock for this variant
                    </span>
                  ) : maxStock <= 5 ? (
                    <span style={{ fontSize: 13, color: '#C99A3D', fontWeight: 600 }}>
                      ● Only {maxStock} left in stock — order soon
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, color: '#2E7D32', fontWeight: 600 }}>
                      ● In Stock & Ready to Dispatch
                    </span>
                  )}
                </div>

                {/* Quantity & Add to Cart */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      border: '1px solid rgba(6,34,60,0.2)',
                      background: '#FFFFFF',
                      height: 52,
                    }}
                  >
                    <button
                      type="button"
                      disabled={quantity <= 1 || isOutOfStock}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      style={{ width: 44, height: '100%', fontSize: 18, color: '#06223C' }}
                    >
                      −
                    </button>
                    <span style={{ minWidth: 36, textAlign: 'center', fontSize: 15, fontWeight: 600, color: '#06223C' }}>
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={quantity >= Math.min(10, maxStock) || isOutOfStock}
                      onClick={() => setQuantity((q) => Math.min(10, maxStock, q + 1))}
                      style={{ width: 44, height: '100%', fontSize: 18, color: '#06223C' }}
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={addingToCart || isOutOfStock}
                    onClick={handleAddToCart}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      height: 52,
                      justifyContent: 'center',
                      fontSize: 12,
                      letterSpacing: '0.2em',
                      opacity: isOutOfStock ? 0.6 : 1,
                    }}
                  >
                    {addingToCart ? 'ADDING TO BAG...' : isOutOfStock ? 'OUT OF STOCK' : 'ADD TO BAG'}
                  </button>
                </div>

                {/* Craft Highlights */}
                <div style={{ background: 'rgba(232, 223, 209, 0.4)', padding: '20px 24px', border: '1px solid rgba(6,34,60,0.06)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, fontSize: 13, color: '#06223C' }}>
                    <div>✓ Pure Breathable Natural Fibers</div>
                    <div>✓ Handcrafted Finishing</div>
                    <div>✓ Easy 7-Day Returns &amp; Exchanges</div>
                    <div>✓ Cash on Delivery Available</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <section style={{ marginTop: 60, borderTop: '1px solid rgba(6,34,60,0.08)', paddingTop: 56 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C99A3D', fontWeight: 600 }}>
                    CUSTOMER VOICES
                  </span>
                  <h2 style={{ fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)", fontSize: '2.2rem', color: '#06223C', fontWeight: 500 }}>
                    Reviews &amp; Experiences
                  </h2>
                </div>

                {user && eligibleOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className="btn-outline-dark"
                    style={{ display: 'inline-flex' }}
                  >
                    WRITE A REVIEW
                  </button>
                )}
              </div>

              {/* Review List */}
              {reviews.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                  {reviews.map((rev) => (
                    <div
                      key={rev._id}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid rgba(6,34,60,0.08)',
                        padding: '24px 28px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ color: '#C99A3D', fontSize: 15 }}>
                          {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                        </div>
                        {rev.verifiedPurchase && (
                          <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#2E7D32', background: 'rgba(46,125,50,0.08)', padding: '2px 8px', fontWeight: 600 }}>
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 14, color: '#2b2b2b', lineHeight: 1.6 }}>
                        &ldquo;{rev.comment}&rdquo;
                      </p>
                      <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid rgba(6,34,60,0.04)', fontSize: 12, color: '#496174' }}>
                        — {typeof rev.user === 'object' ? rev.user.name : 'Customer'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: '#FFFFFF', border: '1px solid rgba(6,34,60,0.08)', padding: '40px 24px', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: '#496174', marginBottom: 12 }}>
                    No reviews yet for this silhouette. Be the first to share your experience after delivery.
                  </p>
                </div>
              )}
            </section>

            {/* Related Products Section */}
            {relatedProducts.length > 0 && (
              <section style={{ marginTop: 80, borderTop: '1px solid rgba(6,34,60,0.08)', paddingTop: 56 }}>
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                  <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C99A3D', fontWeight: 600 }}>
                    COMPLEMENTARY SILHOUETTES
                  </span>
                  <h2 style={{ fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)", fontSize: '2.2rem', color: '#06223C', fontWeight: 500 }}>
                    You May Also Love
                  </h2>
                </div>
                <div className="products-grid">
                  {relatedProducts.map((relProd, idx) => (
                    <ProductCard key={relProd._id} product={relProd} index={idx} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Write Review Modal */}
      {showReviewModal && (
        <div className="modal-overlay open" role="dialog" aria-modal="true">
          <div className="modal-box" style={{ maxWidth: 500, padding: 36 }}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowReviewModal(false)}
            >
              ✕
            </button>

            <h3 style={{ fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)", fontSize: '1.8rem', color: '#06223C', marginBottom: 6 }}>
              Review {product?.name}
            </h3>
            <p style={{ fontSize: 13, color: '#496174', marginBottom: 20 }}>
              Share your feedback on the fit, fabric, and craft with fellow customers.
            </p>

            {reviewError && (
              <div style={{ background: 'rgba(180,40,40,0.08)', border: '1px solid rgba(180,40,40,0.2)', color: '#900', padding: '8px 12px', fontSize: 13, marginBottom: 16 }}>
                {reviewError}
              </div>
            )}

            {reviewSuccess && (
              <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.2)', color: '#2E7D32', padding: '8px 12px', fontSize: 13, marginBottom: 16 }}>
                {reviewSuccess}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {eligibleOrders.length > 1 && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 6 }}>
                    Select Delivered Order
                  </label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(6,34,60,0.2)', background: '#FFF' }}
                  >
                    {eligibleOrders.map((ord) => (
                      <option key={ord.orderId} value={ord.orderId}>
                        Order #{ord.orderNumber}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 6 }}>
                  Rating
                </label>
                <div style={{ display: 'flex', gap: 8, fontSize: 24, cursor: 'pointer' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{ color: star <= rating ? '#C99A3D' : '#DDD', fontSize: 28, padding: 0 }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 6 }}>
                  Your Review
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How did the garment feel? Describe the quality, fit, and weave..."
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid rgba(6,34,60,0.2)', fontFamily: 'inherit', fontSize: 14 }}
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: 8 }}
              >
                {submittingReview ? 'SUBMITTING...' : 'SUBMIT REVIEW'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}
