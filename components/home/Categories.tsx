'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/content'
import { gsap, ScrollTrigger } from '@/lib/gsapUtils'

gsap.registerPlugin(ScrollTrigger)

export default function Categories() {
  const sectionRef = useRef<HTMLElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    const ctx = gsap.context(() => {
      // Head reveal
      gsap.fromTo(
        headRef.current,
        { y: 32, opacity: 0 },
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

      // Category cards stagger reveal
      const cards = gridRef.current?.querySelectorAll('.cat-card')
      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 60, opacity: 0, scale: 0.97 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 1,
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

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="categories"
      className="section-pad"
      style={{ background: '#F8F5EF', paddingTop: 0, marginTop: 50 }}
    >
      <div className="section-max">
        {/* Head */}
        <div ref={headRef} style={{ textAlign: 'center', marginBottom: 40, opacity: 0 }}>
          <div className="section-eyebrow">
            <div className="eyebrow-line" />
            <span className="eyebrow-text">BROWSE</span>
            <div className="eyebrow-line" />
          </div>
          <h2 className="section-title">Shop by Category</h2>
        </div>

        {/* Category grid */}
        <div ref={gridRef} className="cat-grid">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              className="cat-card"
              aria-label={`Shop ${cat.name}`}
            >
              {/* Background color block */}
              <div
                className="cat-card-bg"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: cat.color,
                }}
              />

              {/* Subtle texture overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 2px,
                    rgba(255,255,255,0.03) 2px,
                    rgba(255,255,255,0.03) 4px
                  )`,
                  zIndex: 1,
                }}
              />

              {/* Gold corner ornament */}
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 3,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M2 22 L2 2 L22 2" stroke="#C99A3D" strokeWidth="1" opacity="0.5" />
                </svg>
              </div>

              {/* Content */}
              <div className="cat-card-content">
                <div className="cat-card-title">{cat.name}</div>
                <div className="cat-card-cta">SHOP NOW →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
