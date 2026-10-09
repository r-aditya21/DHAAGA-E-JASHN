'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap, ScrollTrigger } from '@/lib/gsapUtils'

gsap.registerPlugin(ScrollTrigger)

export default function Story() {
  const sectionRef = useRef<HTMLElement>(null)
  const imgRef = useRef<HTMLDivElement>(null)
  const imgInnerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const eyebrowRef = useRef<HTMLParagraphElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const bodyRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLAnchorElement>(null)
  const threadRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    const ctx = gsap.context(() => {
      // Image reveal (slide from left)
      gsap.fromTo(
        imgRef.current,
        { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
        {
          clipPath: 'inset(0 0% 0 0)',
          opacity: 1,
          duration: 1.4,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            once: true,
          },
        }
      )

      // Image parallax
      if (imgInnerRef.current) {
        gsap.to(imgInnerRef.current, {
          yPercent: -10,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.5,
          },
        })
      }

      // Text stagger
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: textRef.current,
          start: 'top 80%',
          once: true,
        },
      })

      tl.fromTo(
        eyebrowRef.current,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
        0.2
      )
        .fromTo(
          titleRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: 'power3.out' },
          0.4
        )
        .fromTo(
          bodyRef.current,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' },
          0.65
        )
        .fromTo(
          ctaRef.current,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
          0.9
        )

      // Thread SVG draw
      if (threadRef.current) {
        gsap.fromTo(
          threadRef.current,
          { strokeDashoffset: 2400 },
          {
            strokeDashoffset: 0,
            duration: 3,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 70%',
              once: true,
            },
          }
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="story" className="story-section">
      {/* Left: Image */}
      <div ref={imgRef} className="story-image-wrap" style={{ opacity: 0 }}>
        <div
          ref={imgInnerRef}
          className="story-image-inner"
          style={{
            background: 'linear-gradient(135deg, #E8DFD1 0%, #D8C6AA 50%, #496174 100%)',
            height: '120%',
            top: '-10%',
          }}
        >
          {/* Textile pattern overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 8px,
                rgba(201,154,61,0.06) 8px,
                rgba(201,154,61,0.06) 9px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 8px,
                rgba(201,154,61,0.06) 8px,
                rgba(201,154,61,0.06) 9px
              )`,
            }}
          />

          {/* Centered brandmark */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="200" height="200" viewBox="0 0 100 100" fill="none" aria-hidden>
              <path d="M50 50 C50 50 44 30 50 15 C56 30 50 50 50 50Z" fill="#C99A3D" opacity="0.2" />
              <path d="M50 50 C50 50 56 70 50 85 C44 70 50 50 50 50Z" fill="#C99A3D" opacity="0.2" />
              <path d="M50 50 C50 50 30 44 15 50 C30 56 50 50 50 50Z" fill="#C99A3D" opacity="0.2" />
              <path d="M50 50 C50 50 70 56 85 50 C70 44 50 50 50 50Z" fill="#C99A3D" opacity="0.2" />
              <circle cx="50" cy="50" r="5" fill="#C99A3D" opacity="0.2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Right: Text */}
      <div ref={textRef} className="story-text">
        {/* Thread SVG decoration */}
        <svg
          className="story-ornament-thread"
          viewBox="0 0 600 500"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            ref={threadRef}
            d="M-10 420C200 520 300 80 600 200S1000 480 1210 60"
            fill="none"
            stroke="#C99A3D"
            strokeWidth="0.8"
            opacity="0.4"
            strokeDasharray="2400"
            strokeDashoffset="2400"
          />
        </svg>

        <div className="story-content">
          <p ref={eyebrowRef} style={{ opacity: 0 }}>
            <span
              style={{
                fontSize: 10,
                letterSpacing: '0.3em',
                color: '#C99A3D',
                fontWeight: 600,
                fontFamily: 'Manrope, sans-serif',
              }}
            >
              THE DHAAGA STORY
            </span>
          </p>

          <div style={{ margin: '12px 0 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 1, background: '#C99A3D', opacity: 0.5 }} />
          </div>

          <h2 ref={titleRef} className="story-title" style={{ opacity: 0 }}>
            Every thread carries
            <br />
            <em style={{ color: '#C99A3D', fontStyle: 'italic' }}>a story.</em>
          </h2>

          <p ref={bodyRef} className="story-body" style={{ opacity: 0 }}>
            Dhaaga-e-Jashn brings the beauty of Indian craftsmanship into everyday
            dressing. Designed with deep respect for tradition and a love for modern
            silhouettes, every piece is made to become part of your daily celebrations.
            We believe clothing is not just cloth &mdash; it is memory, identity, and joy.
          </p>

          <Link
            href="#why"
            ref={ctaRef}
            className="btn-gold-text"
            style={{ opacity: 0 }}
          >
            DISCOVER OUR STORY
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
