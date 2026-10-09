'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap, ScrollTrigger } from '@/lib/gsapUtils'

gsap.registerPlugin(ScrollTrigger)

export default function CTA() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaGroupRef = useRef<HTMLDivElement>(null)
  const ornamentTopRef = useRef<HTMLDivElement>(null)
  const ornamentBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    const ctx = gsap.context(() => {
      // Ornaments
      gsap.fromTo(
        [ornamentTopRef.current, ornamentBottomRef.current],
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1,
          scale: 1,
          duration: 1.2,
          stagger: 0.2,
          ease: 'back.out(1.4)',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            once: true,
          },
        }
      )

      // Title word-by-word
      gsap.fromTo(
        titleRef.current,
        { y: 48, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: titleRef.current,
            start: 'top 82%',
            once: true,
          },
        }
      )

      // Subtitle
      gsap.fromTo(
        subtitleRef.current,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          delay: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: subtitleRef.current,
            start: 'top 85%',
            once: true,
          },
        }
      )

      // CTA group
      gsap.fromTo(
        ctaGroupRef.current,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          delay: 0.3,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: ctaGroupRef.current,
            start: 'top 88%',
            once: true,
          },
        }
      )

      // Float the top ornament
      if (ornamentTopRef.current) {
        gsap.to(ornamentTopRef.current, {
          y: -10,
          rotation: 10,
          duration: 6,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 1.5,
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="cta-section" id="cta">
      {/* Top ornament */}
      <div
        ref={ornamentTopRef}
        style={{
          position: 'absolute',
          top: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: 0,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 100 100" fill="none" aria-hidden>
          <path d="M50 50 C50 50 44 30 50 15 C56 30 50 50 50 50Z" fill="#C99A3D" opacity="0.5" />
          <path d="M50 50 C50 50 56 70 50 85 C44 70 50 50 50 50Z" fill="#C99A3D" opacity="0.5" />
          <path d="M50 50 C50 50 30 44 15 50 C30 56 50 50 50 50Z" fill="#C99A3D" opacity="0.5" />
          <path d="M50 50 C50 50 70 56 85 50 C70 44 50 50 50 50Z" fill="#C99A3D" opacity="0.5" />
          <circle cx="50" cy="50" r="5" fill="#C99A3D" opacity="0.5" />
        </svg>
      </div>

      {/* Divider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div style={{ width: 48, height: 1, background: 'rgba(201,154,61,0.4)' }} />
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(201,154,61,0.6)' }} />
        <div style={{ width: 48, height: 1, background: 'rgba(201,154,61,0.4)' }} />
      </div>

      {/* Title */}
      <h2 ref={titleRef} className="cta-title" style={{ opacity: 0 }}>
        Let every thread
        <br />
        <span style={{ color: '#C99A3D' }}>celebrate.</span>
      </h2>

      {/* Subtitle */}
      <p ref={subtitleRef} className="cta-subtitle" style={{ opacity: 0 }}>
        Where Indian heritage meets modern elegance.
        <br />
        Crafted with love, made to be worn.
      </p>

      {/* CTA group */}
      <div
        ref={ctaGroupRef}
        style={{
          display: 'flex',
          gap: 20,
          justifyContent: 'center',
          flexWrap: 'wrap',
          opacity: 0,
        }}
      >
        <Link href="#new" className="btn-primary">
          SHOP THE COLLECTION
        </Link>
        <Link href="#story" className="btn-outline-light">
          OUR STORY
        </Link>
      </div>

      {/* Bottom ornament */}
      <div
        ref={ornamentBottomRef}
        style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: 0,
        }}
      >
        <svg width="120" height="12" viewBox="0 0 120 12" fill="none" aria-hidden>
          <path
            d="M0 6 C20 2 30 10 60 6 S90 2 120 6"
            stroke="#C99A3D"
            strokeWidth="0.8"
            opacity="0.4"
            fill="none"
          />
        </svg>
      </div>
    </section>
  )
}
