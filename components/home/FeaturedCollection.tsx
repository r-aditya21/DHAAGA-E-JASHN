'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/lib/api/products'
import { colorToHex } from '@/lib/colors'
import { formatPrice } from '@/lib/format'
import { gsap, ScrollTrigger } from '@/lib/gsapUtils'

gsap.registerPlugin(ScrollTrigger)

function KurtaSilhouette({ color }: { color: string }) {
  const isLight =
    color === '#EFE8DA' || color === '#D8C6AA'

  const fill = isLight
    ? 'rgba(6,34,60,0.12)'
    : 'rgba(248,245,239,0.12)'

  return (
    <svg
      viewBox="0 0 100 130"
      aria-hidden
      className="h-[85%] w-[65%]"
    >
      <path
        d="M36 6l14 8 14-8 12 10 10 40-10 4-2-18v90H26V42l-2 18-10-4 10-40z"
        fill={fill}
      />

      <path
        d="M44 14 Q50 20 56 14"
        fill="none"
        stroke={fill}
        strokeWidth="1"
      />

      <line
        x1="50"
        y1="20"
        x2="50"
        y2="50"
        stroke={fill}
        strokeWidth="0.8"
      />
    </svg>
  )
}

export default function FeaturedCollection({
  products: featuredProducts,
}: {
  products: Product[]
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || featuredProducts.length === 0) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (reducedMotion) return

    const ctx = gsap.context(() => {
      // Header reveal
      gsap.fromTo(
        headRef.current,
        {
          y: 32,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: headRef.current,
            start: 'top 82%',
            once: true,
          },
        }
      )

      // Cards reveal
      const cards =
        gridRef.current?.querySelectorAll(
          '.featured-card'
        )

      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          {
            y: 60,
            opacity: 0,
            scale: 0.97,
          },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 1.1,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: gridRef.current,
              start: 'top 78%',
              once: true,
            },
          }
        )
      }

      // Gold decorative line
      const line =
        sectionRef.current?.querySelector(
          '.featured-gold-line'
        )

      if (line) {
        gsap.fromTo(
          line,
          {
            scaleX: 0,
          },
          {
            scaleX: 1,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 75%',
              once: true,
            },
          }
        )
      }

      // CTA
      gsap.fromTo(
        ctaRef.current,
        {
          y: 20,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 88%',
            once: true,
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [featuredProducts.length])

  if (featuredProducts.length === 0) return null

  return (
    <section
      ref={sectionRef}
      id="collection"
      className="featured-section"
    >
      {/* Gold line */}
      <div
        className="
          featured-gold-line
          mb-20
          h-px
          origin-left
          opacity-40
          bg-[linear-gradient(to_right,transparent,#C99A3D_30%,#C99A3D_70%,transparent)]
        "
      />

      {/* Header */}
      <div
        ref={headRef}
        className="mb-24 text-center opacity-0"
      >
        <div className="section-eyebrow">
          <div className="eyebrow-line" />

          <span
            className="eyebrow-text"
            style={{
              color: 'rgba(201,154,61,0.85)',
            }}
          >
            SIGNATURE PIECES
          </span>

          <div className="eyebrow-line" />
        </div>

        <h2 className="section-title section-title-light">
          The Everyday Collection
        </h2>

        <p className="section-subtitle section-subtitle-light">
          Timeless silhouettes. Easy fabrics. Made for every day.
        </p>
      </div>

      {/* Featured Grid */}
      <div
        ref={gridRef}
        className="
          flex justify-evenly pt-[25px]
          w-full
          max-w-[1400px]
        "
      >
        {featuredProducts.map((product) => (
          <FeaturedCard
            key={product._id}
            product={product}
          />
        ))}
      </div>

      {/* CTA */}
      <div
        ref={ctaRef}
        className="
          mt-12
          text-center
          opacity-0
        "
      >
        <Link
          href="/shop"
          className="btn-outline-light"
        >
          EXPLORE FULL COLLECTION →
        </Link>
      </div>
    </section>
  )
}

function FeaturedCard({ product }: { product: Product }) {
  const href = `/product/${product.slug}`
  const image = product.images?.[0]
  const firstColor = product.variants?.[0]?.color ?? 'Ivory'
  const swatch = colorToHex(firstColor)

  return (
    <article className="featured-card flex w-full max-w-[320px] min-w-0 flex-col">
      {/* Product image: a real link to the product page */}
      <Link
        href={href}
        className="relative block aspect-[3/4] w-full shrink-0 overflow-hidden"
        style={{ background: swatch }}
        aria-label={`View ${product.name}`}
      >
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 80vw, 320px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div className="absolute inset-0 flex items-end justify-center">
            <KurtaSilhouette color={swatch} />
          </div>
        )}

        {/* Gold corner ornament */}
        <div className="absolute left-3 top-3 z-20">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M1 19 L1 1 L19 1" stroke="#C99A3D" strokeWidth="1" opacity="0.6" />
          </svg>
        </div>

        <div className="absolute inset-0 z-10 bg-[linear-gradient(transparent_50%,rgba(6,34,60,0.6))]" />

        <span className="product-card-add relative z-20">VIEW PIECE</span>
      </Link>

      {/* Product information */}
      <div className="flex h-[155px] min-h-[155px] w-full shrink-0 flex-col pt-4">
        <h3 className="featured-card-name m-0 h-[24px] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap">
          <Link href={href}>{product.name}</Link>
        </h3>

        <p className="featured-card-desc m-0 mt-2 line-clamp-2 h-[40px] min-h-[40px] shrink-0 overflow-hidden leading-5">
          {product.description}
        </p>

        <p className="featured-card-price m-0 mt-auto">{formatPrice(product.price)}</p>
      </div>
    </article>
  )
}
