'use client'

import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsapUtils'

gsap.registerPlugin(ScrollTrigger)

export default function BrandIntro() {
  const sectionRef = useRef<HTMLElement>(null)
  const quoteRef = useRef<HTMLParagraphElement>(null)
  const lineLeftRef = useRef<HTMLDivElement>(null)
  const lineRightRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !quoteRef.current) return

    const ctx = gsap.context(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reducedMotion) return

      // Quote reveal
      gsap.fromTo(
        quoteRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 78%',
            once: true,
          },
        }
      )

      // Divider lines expand
      if (lineLeftRef.current && lineRightRef.current) {
        gsap.fromTo(
          [lineLeftRef.current, lineRightRef.current],
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1,
            ease: 'power3.out',
            stagger: 0.1,
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 80%',
              once: true,
            },
          }
        )
      }

      if (dotRef.current) {
        gsap.fromTo(
          dotRef.current,
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.6,
            delay: 0.3,
            ease: 'back.out(1.7)',
            scrollTrigger: {
              trigger: sectionRef.current,
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
    <section ref={sectionRef} className="brand-intro">
      {/* Background decorative pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(201,154,61,0.04) 0%, transparent 40%),
            radial-gradient(circle at 80% 50%, rgba(6,34,60,0.04) 0%, transparent 40%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Divider ornament */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 32,
        }}
      >
        <div
          ref={lineLeftRef}
          style={{
            width: 64,
            height: 1,
            background: '#C99A3D',
            opacity: 0.5,
            transformOrigin: 'right',
          }}
        />
        <div
          ref={dotRef}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#C99A3D',
            opacity: 0.8,
          }}
        />
        <div
          ref={lineRightRef}
          style={{
            width: 64,
            height: 1,
            background: '#C99A3D',
            opacity: 0.5,
            transformOrigin: 'left',
          }}
        />
      </div>

      <p ref={quoteRef} className="brand-intro-quote" style={{ opacity: 0 }}>
        &ldquo;Every thread is a promise. Every garment, a celebration of where we come
        from &mdash; and who we are becoming.&rdquo;
      </p>

      {/* Divider ornament bottom */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginTop: 32,
        }}
      >
        <div style={{ width: 64, height: 1, background: '#C99A3D', opacity: 0.3 }} />
        <svg width="14" height="14" viewBox="0 0 100 100" fill="none" aria-hidden>
          <path d="M50 50 C50 50 44 30 50 15 C56 30 50 50 50 50Z" fill="#C99A3D" opacity="0.5" />
          <path d="M50 50 C50 50 56 70 50 85 C44 70 50 50 50 50Z" fill="#C99A3D" opacity="0.5" />
          <path d="M50 50 C50 50 30 44 15 50 C30 56 50 50 50 50Z" fill="#C99A3D" opacity="0.5" />
          <path d="M50 50 C50 50 70 56 85 50 C70 44 50 50 50 50Z" fill="#C99A3D" opacity="0.5" />
        </svg>
        <div style={{ width: 64, height: 1, background: '#C99A3D', opacity: 0.3 }} />
      </div>
    </section>
  )
}
