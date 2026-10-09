'use client'

import { useEffect, useRef } from 'react'
import { CRAFT_PILLARS } from '@/lib/content'
import { gsap, ScrollTrigger } from '@/lib/gsapUtils'

gsap.registerPlugin(ScrollTrigger)

// Icon components for each craft pillar
function CraftIcon({ type }: { type: string }) {
  const strokeProps = {
    fill: 'none',
    stroke: '#C99A3D',
    strokeWidth: 1.3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (type) {
    case 'wave':
      return (
        <svg viewBox="0 0 24 24" className="craft-icon" {...strokeProps}>
          <path d="M3 12c3-6 6 6 9 0s6 6 9 0" {...strokeProps} />
        </svg>
      )
    case 'loom':
      return (
        <svg viewBox="0 0 24 24" className="craft-icon" {...strokeProps}>
          <path d="M8 3l4 3 4-3 4 4-3 3v11H7V10L4 7z" {...strokeProps} />
        </svg>
      )
    case 'repeat':
      return (
        <svg viewBox="0 0 24 24" className="craft-icon" {...strokeProps}>
          <path d="M4 12a8 8 0 0114-5M20 12a8 8 0 01-14 5M18 3v4h-4M6 21v-4h4" {...strokeProps} />
        </svg>
      )
    case 'thread':
      return (
        <svg viewBox="0 0 24 24" className="craft-icon" {...strokeProps}>
          <path d="M12 3c2 4 2 6 9 9-7 3-7 5-9 9-2-4-2-6-9-9 7-3 7-5 9-9z" {...strokeProps} />
        </svg>
      )
    default:
      return null
  }
}

export default function Craftsmanship() {
  const sectionRef = useRef<HTMLElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const brandmarkRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    const ctx = gsap.context(() => {
      // Brandmark
      gsap.fromTo(
        brandmarkRef.current,
        { opacity: 0, scale: 0.85, rotation: -15 },
        {
          opacity: 1,
          scale: 1,
          rotation: 0,
          duration: 1.2,
          ease: 'back.out(1.4)',
          scrollTrigger: {
            trigger: brandmarkRef.current,
            start: 'top 85%',
            once: true,
          },
        }
      )

      // Head
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

      // Craft items stagger
      const items = gridRef.current?.querySelectorAll('.craft-item')
      if (items && items.length > 0) {
        gsap.fromTo(
          items,
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            stagger: 0.13,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: gridRef.current,
              start: 'top 80%',
              once: true,
            },
          }
        )
      }

      // Floating brandmark animation
      if (brandmarkRef.current) {
        gsap.to(brandmarkRef.current, {
          y: -8,
          duration: 5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 1.5,
        })
        gsap.to(brandmarkRef.current, {
          rotation: 8,
          duration: 7,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 0.5,
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="why"
      className="section-pad"
      style={{ background: '#F8F5EF' }}
    >
      <div className="section-max">
        {/* Brandmark */}
        <div
          ref={brandmarkRef}
          style={{
            textAlign: 'center',
            marginBottom: 16,
            opacity: 0,
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 100 100"
            fill="none"
            aria-hidden
          >
            <path d="M50 50 C50 50 44 30 50 15 C56 30 50 50 50 50Z" fill="#C99A3D" />
            <path d="M50 50 C50 50 56 70 50 85 C44 70 50 50 50 50Z" fill="#C99A3D" />
            <path d="M50 50 C50 50 30 44 15 50 C30 56 50 50 50 50Z" fill="#C99A3D" />
            <path d="M50 50 C50 50 70 56 85 50 C70 44 50 50 50 50Z" fill="#C99A3D" />
            <circle cx="50" cy="50" r="5" fill="#C99A3D" />
          </svg>
        </div>

        {/* Head */}
        <div
          ref={headRef}
          style={{ textAlign: 'center', marginBottom: 56, opacity: 0 }}
        >
          <div className="section-eyebrow">
            <div className="eyebrow-line" />
            <span className="eyebrow-text">OUR PROMISE</span>
            <div className="eyebrow-line" />
          </div>
          <h2 className="section-title">Why Dhaaga</h2>
          <p className="section-subtitle">
            Four pillars that define everything we make.
          </p>
        </div>

        {/* Craft grid */}
        <div ref={gridRef} className="craft-grid">
          {CRAFT_PILLARS.map((pillar) => (
            <div key={pillar.number} className="craft-item">
              {/* Icon */}
              <div className="craft-icon">
                <CraftIcon type={pillar.icon} />
              </div>

              <span className="craft-number">{pillar.number}</span>
              <h3 className="craft-title">{pillar.title}</h3>
              <p className="craft-desc">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
