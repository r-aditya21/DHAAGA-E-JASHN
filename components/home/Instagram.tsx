'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsapUtils'

gsap.registerPlugin(ScrollTrigger)

const INSTA_COLORS = [
  { bg: '#496174', label: 'Post 1' },
  { bg: '#E8DFD1', label: 'Post 2' },
  { bg: '#06223C', label: 'Post 3' },
  { bg: '#D8C6AA', label: 'Post 4' },
  { bg: '#2b2b2b', label: 'Post 5' },
  { bg: '#EFE8DA', label: 'Post 6' },
]

export default function Instagram() {
  const sectionRef = useRef<HTMLElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        headRef.current,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: headRef.current,
            start: 'top 82%',
            once: true,
          },
        }
      )

      const items = gridRef.current?.querySelectorAll('.insta-item')
      if (items && items.length > 0) {
        gsap.fromTo(
          items,
          { scale: 0.94, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.7,
            stagger: 0.07,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: gridRef.current,
              start: 'top 82%',
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
      className="section-pad"
      style={{ background: '#F8F5EF', paddingBottom: 0 }}
    >
      <div className="section-max">
        <div
          ref={headRef}
          style={{ textAlign: 'center', marginBottom: 40, opacity: 0,}}
        >
          <div className="section-eyebrow">
            <div className="eyebrow-line" />
            <span className="eyebrow-text">INSTAGRAM</span>
            <div className="eyebrow-line" />
          </div>
          <h2 className="section-title">@DHAAGAEJASHN</h2>
          <p className="section-subtitle">Styled by you. Worn every day.</p>
        </div>

        <div ref={gridRef} className="insta-grid">
          {INSTA_COLORS.map((item, i) => (
            <a
              key={i}
              href="#"
              className="insta-item"
              style={{ background: item.bg }}
              aria-label={`Instagram ${item.label}`}
            >
              {/* Subtle textile pattern */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 4px,
                    rgba(255,255,255,0.03) 4px,
                    rgba(255,255,255,0.03) 8px
                  )`,
                }}
              />
              <div className="insta-item-overlay">
                ◎ &nbsp; VIEW POST
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
