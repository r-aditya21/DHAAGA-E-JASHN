'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { SIZES } from '@/lib/content'
import { formatPrice } from '@/lib/format'
import { AnyProduct, KurtaSilhouette } from '@/components/shop/ProductCard'
import { useAuth } from '@/context/AuthContext'
import { useAuthModal } from '@/context/AuthModalContext'
import { addToCart } from '@/lib/api/cart'

interface QuickViewModalProps {
  product: AnyProduct | null
  onClose: () => void
}

export default function QuickViewModal({
  product,
  onClose,
}: QuickViewModalProps) {
  const { user, refreshCart } = useAuth()
  const { openAuth } = useAuthModal()
  const [selectedSize, setSelectedSize] = useState<string>('M')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (product) {
      document.body.style.overflow = 'hidden'
      if (product.variants && product.variants.length > 0) {
        setSelectedSize(product.variants[0].size)
        setSelectedColor(product.variants[0].color)
      } else {
        setSelectedSize('M')
        setSelectedColor(product.colorName || 'Ivory')
      }
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [product])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  if (!product) {
    return null
  }

  const sizes = product.variants
    ? Array.from(new Set(product.variants.map((v) => v.size)))
    : Array.from(SIZES)

  const handleAddToBag = async () => {
    if (product._id) {
      if (!user) {
        onClose()
        openAuth({ message: 'Sign in to add pieces to your bag.' })
        return
      }

      try {
        setLoading(true)
        const variant = product.variants?.find(
          (v) => v.size === selectedSize && (!selectedColor || v.color.toLowerCase() === selectedColor.toLowerCase())
        ) || product.variants?.[0]

        await addToCart({
          productId: product._id,
          size: variant ? variant.size : selectedSize,
          color: variant ? variant.color : (selectedColor || 'Ivory'),
          quantity: 1,
        })
        await refreshCart()
        window.dispatchEvent(
          new CustomEvent('dhaaga:toast', {
            detail: `Added ${product.name} (${selectedSize}) to your bag ✓`,
          })
        )
        onClose()
      } catch (err: any) {
        window.dispatchEvent(
          new CustomEvent('dhaaga:toast', {
            detail: err?.message || 'Could not add to bag',
          })
        )
      } finally {
        setLoading(false)
      }
    } else {
      window.dispatchEvent(new CustomEvent('dhaaga:addtobag'))
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', {
          detail: 'Added to your bag ✓',
        })
      )
      onClose()
    }
  }

  const bgHex = product.color || '#EFE8DA'

  return (
    <div
      ref={overlayRef}
      className="modal-overlay open"
      role="dialog"
      aria-modal="true"
      aria-label="Quick view"
      onClick={(event) => {
        if (event.target === overlayRef.current) {
          onClose()
        }
      }}
    >
      <div className="modal-box">
        <button
          type="button"
          className="modal-close"
          aria-label="Close quick view"
          onClick={onClose}
        >
          ✕
        </button>

        {/* Image */}
        <div
          className="modal-img-wrap"
          style={{
            background: bgHex,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {product.images && product.images.length > 0 && product.images[0].startsWith('http') ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <KurtaSilhouette color={bgHex} />
          )}
        </div>

        {/* Product info */}
        <div className="modal-info">
          <h3 className="modal-title">{product.name}</h3>

          <p className="modal-price">{formatPrice(product.price)}</p>

          <p className="modal-desc">{product.description}</p>

          <p className="modal-label">
            COLOR:{' '}
            <span
              style={{
                color: '#06223C',
                fontWeight: 700,
              }}
            >
              {product.colorName || selectedColor || 'Classic'}
            </span>
          </p>

          <div>
            <p
              className="modal-label"
              style={{
                marginBottom: 10,
              }}
            >
              SIZE
            </p>

            <div className="modal-sizes">
              {sizes.map((size) => (
                <button
                  type="button"
                  key={size}
                  className={`modal-size-btn ${
                    selectedSize === size ? 'active' : ''
                  }`}
                  aria-label={`Size ${size}`}
                  aria-pressed={selectedSize === size}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn-outline-dark"
            style={{
              marginTop: 16,
              width: '100%',
              justifyContent: 'center',
            }}
            onClick={handleAddToBag}
            disabled={loading}
          >
            {loading ? 'ADDING TO BAG...' : 'ADD TO BAG'}
          </button>

          {product.slug && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Link
                href={`/product/${product.slug}`}
                onClick={onClose}
                style={{
                  fontSize: 12,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#C99A3D',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                View Full Details & Reviews →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
