'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsapUtils'
import ProductCard, { AnyProduct } from '@/components/shop/ProductCard'
import QuickViewModal from '@/components/shop/QuickViewModal'
import Toast from '@/components/ui/Toast'
import BagCountManager from '@/components/ui/BagCountManager'

gsap.registerPlugin(ScrollTrigger)

interface ProductGridProps {
  category: 'new' | 'bestseller'
  /** Live products from the API. The section is hidden when there are none. */
  products: AnyProduct[]
  title: string
  subtitle?: string
  id: string
  background?: string
}

export default function ProductGrid({
  category,
  products,
  title,
  subtitle,
  id,
  background,
}: ProductGridProps) {
  const [quickViewProduct, setQuickViewProduct] = useState<AnyProduct | null>(null)

  const sectionRef = useRef<HTMLElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !headRef.current || !gridRef.current) {
      return
    }

    if (products.length === 0) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (reducedMotion) {
      headRef.current.style.opacity = '1'
      gridRef.current
        .querySelectorAll('.product-card')
        .forEach((card) => {
          ;(card as HTMLElement).style.opacity = '1'
        })
      return
    }

    const context = gsap.context(() => {
      /* Heading */
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

      /* Cards */
      const cards = gridRef.current?.querySelectorAll('.product-card')

      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          {
            y: 48,
            opacity: 0,
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: gridRef.current,
              start: 'top 80%',
              once: true,
            },
          }
        )
      }
    }, sectionRef)

    return () => {
      context.revert()
    }
  }, [products.length])

  if (products.length === 0) return null

  return (
    <>
      <BagCountManager />
      <Toast />

      <section
        ref={sectionRef}
        id={id}
        className="section-pad"
        style={{
          background: background ?? '#F8F5EF',
          maxWidth: '100%',
        }}
      >
        <div className="section-max">
          {/* Heading */}
          <div
            ref={headRef}
            style={{
              textAlign: 'center',
              marginBottom: 56,
              opacity: 0,
            }}
          >
            <div className="section-eyebrow">
              <div className="eyebrow-line" />

              <span className="eyebrow-text">
                {category === 'new' ? 'JUST ARRIVED' : 'MOST LOVED'}
              </span>

              <div className="eyebrow-line" />
            </div>

            <h2 className="section-title">{title}</h2>

            {subtitle && <p className="section-subtitle">{subtitle}</p>}
          </div>

          {/* Products */}
          <div ref={gridRef} className="products-grid">
            {products.map((product, index) => (
              <ProductCard
                key={product._id ?? product.id}
                product={product}
                index={index}
                onQuickView={setQuickViewProduct}
              />
            ))}
          </div>
        </div>
      </section>

      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </>
  )
}
