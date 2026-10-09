'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap, ScrollTrigger } from '@/lib/gsapUtils'

gsap.registerPlugin(ScrollTrigger)

export default function BannerSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    const ctx = gsap.context(() => {
      // Content reveal
      gsap.fromTo(
        contentRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            once: true,
          },
        }
      )

      // Parallax BG
      if (bgRef.current) {
        gsap.to(bgRef.current, {
          yPercent: -20,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.5,
          },
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="banner-section">
      {/* Parallax background */}
      <div
        ref={bgRef}
        style={{
          position: 'absolute',
          inset: '-20%',
          background: `linear-gradient(135deg, #06223C 0%, #0d3558 35%, #496174 70%, #06223C 100%)`,
          backgroundSize: '400% 400%',
        }}
      />

      {/* Textile pattern overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 3px,
            rgba(201,154,61,0.04) 3px,
            rgba(201,154,61,0.04) 6px
          )`,
          zIndex: 1,
        }}
      />

      <div className="banner-overlay" style={{ zIndex: 2 }} />

      {/* Decorative border */}
      <div
        style={{
          position: 'absolute',
          inset: 32,
          border: '1px solid rgba(201,154,61,0.2)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />

      {/* Corner ornaments */}
      {[
        { top: 24, left: 24 },
        { top: 24, right: 24, transform: 'scaleX(-1)' },
        { bottom: 24, left: 24, transform: 'scaleY(-1)' },
        { bottom: 24, right: 24, transform: 'scale(-1)' },
      ].map((style, i) => (
        <div
          key={i}
          style={{ position: 'absolute', zIndex: 4, ...style }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M1 19 L1 1 L19 1" stroke="#C99A3D" strokeWidth="1" opacity="0.5" />
          </svg>
        </div>
      ))}

      {/* Content */}
      <div ref={contentRef} className="banner-content" style={{ position: 'relative', zIndex: 5, opacity: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div style={{ width: 40, height: 1, background: 'rgba(201,154,61,0.5)' }} />
          <span
            style={{
              fontSize: 10,
              letterSpacing: '0.3em',
              color: '#C99A3D',
              fontWeight: 600,
              fontFamily: 'Manrope, sans-serif',
            }}
          >
            HERITAGE · CRAFT · CELEBRATION
          </span>
          <div style={{ width: 40, height: 1, background: 'rgba(201,154,61,0.5)' }} />
        </div>

        <h2 ref={titleRef} className="banner-title">
          ROOTED IN INDIA.
          <br />
          MADE FOR TODAY.
        </h2>

        <Link href="#new" className="btn-primary">
          EXPLORE THE COLLECTION
        </Link>
      </div>
    </section>
  )
}
