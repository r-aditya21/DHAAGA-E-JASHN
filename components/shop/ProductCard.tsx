'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/format'
import { useAuth } from '@/context/AuthContext'
import { useAuthModal } from '@/context/AuthModalContext'
import { addToWishlist, removeFromWishlist } from '@/lib/api/wishlist'
import { addToCart } from '@/lib/api/cart'

export interface AnyProduct {
  _id?: string
  id?: string
  name: string
  slug?: string
  description: string
  price: number
  color?: string
  colorName?: string
  category?: any
  swatches?: string[]
  images?: string[]
  variants?: Array<{
    _id?: string
    size: string
    color: string
    stock: number
  }>
  isActive?: boolean
}

interface ProductCardProps {
  product: AnyProduct
  onQuickView?: (product: AnyProduct) => void
  index: number
  variant?: 'default' | 'featured'
}

const COLOR_NAMES: Record<string, string> = {
  '#EFE8DA': 'Ivory',
  '#06223C': 'Navy',
  '#D8C6AA': 'Sand Beige',
  '#2b2b2b': 'Charcoal',
  '#0d3558': 'Heritage Navy',
  '#496174': 'Muted Slate',
  '#0a2c4d': 'Midnight Blue',
  '#222': 'Charcoal',
  '#E8DFD1': 'Warm Ivory',
}

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

export function KurtaSilhouette({ color }: { color: string }) {
  const isLight =
    color === '#EFE8DA' ||
    color === '#D8C6AA' ||
    color === '#E8DFD1' ||
    color?.toLowerCase() === 'ivory' ||
    color?.toLowerCase() === 'beige'

  const strokeColor = isLight
    ? 'rgba(6,34,60,0.15)'
    : 'rgba(248,245,239,0.15)'

  return (
    <svg
      viewBox="0 0 100 130"
      aria-hidden="true"
      style={{
        width: '65%',
        height: '85%',
      }}
    >
      <path
        d="M36 6l14 8 14-8 12 10 10 40-10 4-2-18v90H26V42l-2 18-10-4 10-40z"
        fill={strokeColor}
      />
      <path
        d="M44 14 Q50 20 56 14"
        fill="none"
        stroke={strokeColor}
        strokeWidth="1"
      />
      <line
        x1="50"
        y1="20"
        x2="50"
        y2="50"
        stroke={strokeColor}
        strokeWidth="0.8"
      />
    </svg>
  )
}

export default function ProductCard({
  product,
  onQuickView,
  index,
  variant = 'default',
}: ProductCardProps) {
  const { user, wishlistIds, refreshWishlist, refreshCart } = useAuth()
  const { openAuth } = useAuthModal()
  const productId = product._id || product.id || ''
  const isWishlisted = wishlistIds.includes(productId)
  const [loadingAction, setLoadingAction] = useState(false)

  // Color resolution
  const firstVariantColor = product.variants?.[0]?.color
  const mainColorName = product.colorName || firstVariantColor || 'Ivory'
  const mainHex =
    product.color ||
    COLOR_HEX_MAP[mainColorName.toLowerCase()] ||
    '#EFE8DA'

  const swatches = product.swatches || (product.variants ? Array.from(new Set(product.variants.map((v) => COLOR_HEX_MAP[v.color.toLowerCase()] || '#EFE8DA'))) : [mainHex])

  const productUrl = product.slug ? `/product/${product.slug}` : `/shop`

  const handleWishlist = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      openAuth({ message: 'Sign in to save pieces to your wishlist.' })
      return
    }

    if (!productId) return

    try {
      if (isWishlisted) {
        await removeFromWishlist(productId)
        window.dispatchEvent(
          new CustomEvent('dhaaga:toast', {
            detail: 'Removed from wishlist',
          })
        )
      } else {
        await addToWishlist(productId)
        window.dispatchEvent(
          new CustomEvent('dhaaga:toast', {
            detail: 'Added to wishlist ♥',
          })
        )
      }
      await refreshWishlist()
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', {
          detail: err?.message || 'Could not update wishlist',
        })
      )
    }
  }

  const handleAddToBag = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      openAuth({ message: 'Sign in to add pieces to your bag.' })
      return
    }

    if (!product._id || !product.variants || product.variants.length === 0) {
      if (onQuickView) {
        onQuickView(product)
      }
      return
    }

    const availableVariant = product.variants.find((v) => v.stock > 0) || product.variants[0]

    try {
      setLoadingAction(true)
      await addToCart({
        productId: product._id,
        size: availableVariant.size,
        color: availableVariant.color,
        quantity: 1,
      })
      await refreshCart()
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', {
          detail: `Added ${product.name} (${availableVariant.size}) to bag`,
        })
      )
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', {
          detail: err?.message || 'Could not add to bag',
        })
      )
    } finally {
      setLoadingAction(false)
    }
  }

  const handleImageClick = (e: React.MouseEvent) => {
    if (onQuickView) {
      onQuickView(product)
    }
  }

  return (
    <article className="product-card" aria-label={product.name}>
      {/* Product image */}
      <div
        className="product-card-img"
        tabIndex={0}
        role="button"
        aria-label={`Quick view ${product.name}`}
        onClick={handleImageClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (onQuickView) onQuickView(product)
          }
        }}
        style={{
          background: mainHex,
        }}
      >
        <div
          className="product-card-img-inner"
          style={{
            background: mainHex,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          {product.images && product.images.length > 0 && product.images[0].startsWith('http') ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <KurtaSilhouette color={mainHex} />
          )}
        </div>

        <div className="product-card-overlay" />

        {/* Wishlist */}
        <button
          type="button"
          className={`product-card-wish ${isWishlisted ? 'active' : ''}`}
          aria-label={`${isWishlisted ? 'Remove' : 'Add'} ${product.name} from wishlist`}
          onClick={handleWishlist}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill={isWishlisted ? '#C99A3D' : 'none'}
            stroke={isWishlisted ? '#C99A3D' : '#06223C'}
            strokeWidth="1.5"
          >
            <path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z" />
          </svg>
        </button>

        {/* Add to bag */}
        <button
          type="button"
          className="product-card-add"
          aria-label={`Add ${product.name} to bag`}
          onClick={handleAddToBag}
          disabled={loadingAction}
        >
          {loadingAction ? 'ADDING...' : 'ADD TO BAG'}
        </button>

        <div className="product-card-gold-line" />

        {/* New badge */}
        {index < 2 && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              background: '#C99A3D',
              color: '#06223C',
              fontSize: 9,
              letterSpacing: '0.15em',
              fontWeight: 700,
              padding: '4px 10px',
              zIndex: 2,
              fontFamily: 'Manrope, sans-serif',
            }}
          >
            NEW
          </div>
        )}
      </div>

      {/* Product information */}
      <div
        className={
          variant === 'featured' ? 'featured-card-info' : 'product-card-info'
        }
      >
        <h3
          className={
            variant === 'featured' ? 'featured-card-name' : 'product-card-name'
          }
        >
          <Link href={productUrl} style={{ color: 'inherit' }}>
            {product.name}
          </Link>
        </h3>

        <p
          className={
            variant === 'featured' ? 'featured-card-desc' : 'product-card-desc'
          }
        >
          {product.description}
        </p>

        <p
          className={
            variant === 'featured' ? 'featured-card-price' : 'product-card-price'
          }
        >
          {formatPrice(product.price)}
        </p>

        <div className="product-swatches">
          {swatches.map((swatch, idx) => (
            <div
              key={`${swatch}-${idx}`}
              className="swatch"
              style={{
                background: swatch,
              }}
              title={COLOR_NAMES[swatch] ?? 'As shown'}
              aria-label={COLOR_NAMES[swatch] ?? 'Color swatch'}
            />
          ))}
        </div>
      </div>
    </article>
  )
}