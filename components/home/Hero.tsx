'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { gsap, ScrollTrigger } from '@/lib/gsapUtils'

gsap.registerPlugin(ScrollTrigger)

/* =========================================================
   GOLD CORNER ORNAMENT
   =====F==================================================== */

function GoldCorner({
  position,
}: {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}) {
  return (
    <div
      className={`hero-corner hero-corner-${position}`}
      aria-hidden="true"
    >
      <span className="corner-horizontal" />
      <span className="corner-vertical" />
      <span className="corner-dot" />
    </div>
  )
}

/* =========================================================
   HERO
   ========================================================= */

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null)

  const backgroundRef = useRef<HTMLDivElement>(null)

  const panelRef = useRef<HTMLDivElement>(null)

  const eyebrowRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const hindiRef = useRef<HTMLParagraphElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const buttonsRef = useRef<HTMLDivElement>(null)

  const emblemRef = useRef<HTMLDivElement>(null)
  const outerRingRef = useRef<HTMLDivElement>(null)
  const innerRingRef = useRef<HTMLDivElement>(null)
  const emblemCenterRef = useRef<HTMLDivElement>(null)

  const threadRef = useRef<SVGPathElement>(null)
  const threadGlowRef = useRef<SVGPathElement>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    const ctx = gsap.context(() => {
      /* =====================================================
         REDUCED MOTION
         ===================================================== */

      if (reducedMotion) {
        return
      }

      /* =====================================================
         INITIAL HERO ANIMATION
         ===================================================== */

      const intro = gsap.timeline({
        defaults: {
          ease: 'power3.out',
        },
      })

      intro
        .fromTo(
          panelRef.current,
          {
            opacity: 0,
            x: -30,
          },
          {
            opacity: 1,
            x: 0,
            duration: 1.1,
          },
          0
        )

        .fromTo(
          eyebrowRef.current,
          {
            opacity: 0,
            y: 20,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
          },
          0.35
        )

        .fromTo(
          titleRef.current,
          {
            opacity: 0,
            y: 55,
            clipPath: 'inset(0 0 100% 0)',
          },
          {
            opacity: 1,
            y: 0,
            clipPath: 'inset(0 0 0% 0)',
            duration: 1.15,
          },
          0.5
        )

        .fromTo(
          hindiRef.current,
          {
            opacity: 0,
            y: 20,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
          },
          0.95
        )

        .fromTo(
          subtitleRef.current,
          {
            opacity: 0,
            y: 20,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
          },
          1.05
        )

        .fromTo(
          buttonsRef.current,
          {
            opacity: 0,
            y: 20,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
          },
          1.2
        )

        .fromTo(
          emblemRef.current,
          {
            opacity: 0,
            scale: 0.78,
          },
          {
            opacity: 1,
            scale: 1,
            duration: 1.25,
            ease: 'power3.out',
          },
          0.65
        )

        .fromTo(
          scrollRef.current,
          {
            opacity: 0,
            y: 15,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
          },
          1.35
        )

      /* =====================================================
         BACKGROUND PARALLAX
         ===================================================== */

      if (backgroundRef.current) {
        gsap.to(backgroundRef.current, {
          yPercent: -5,
          scale: 1.04,
          ease: 'none',

          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.5,
          },
        })
      }

      /* =====================================================
         OUTER RING ROTATION
         ===================================================== */

      if (outerRingRef.current) {
        gsap.to(outerRingRef.current, {
          rotation: 360,
          duration: 30,
          repeat: -1,
          ease: 'none',
        })
      }

      /* =====================================================
         INNER RING REVERSE ROTATION
         ===================================================== */

      if (innerRingRef.current) {
        gsap.to(innerRingRef.current, {
          rotation: -360,
          duration: 42,
          repeat: -1,
          ease: 'none',
        })
      }

      /* =====================================================
         CENTER EMBLEM GENTLE FLOAT
         ===================================================== */

      if (emblemCenterRef.current) {
        gsap.to(emblemCenterRef.current, {
          y: -5,
          duration: 3.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      }

      /* =====================================================
         THREAD DRAW
         ===================================================== */

      if (threadRef.current) {
        const length = threadRef.current.getTotalLength()

        gsap.set(threadRef.current, {
          strokeDasharray: length,
          strokeDashoffset: length,
        })

        gsap.to(threadRef.current, {
          strokeDashoffset: 0,
          duration: 3.8,
          delay: 1.05,
          ease: 'power2.inOut',
        })
      }

      if (threadGlowRef.current) {
        const length = threadGlowRef.current.getTotalLength()

        gsap.set(threadGlowRef.current, {
          strokeDasharray: length,
          strokeDashoffset: length,
        })

        gsap.to(threadGlowRef.current, {
          strokeDashoffset: 0,
          duration: 3.8,
          delay: 1.05,
          ease: 'power2.inOut',
        })
      }

      /* =====================================================
         SCROLL INDICATOR
         ===================================================== */

      if (scrollRef.current) {
        gsap.to(scrollRef.current, {
          y: 7,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="hero-section-v2"
      id="top"
    >
      {/* =====================================================
          BACKGROUND
          ===================================================== */}

      <div
        ref={backgroundRef}
        className="hero-background-v2"
        aria-hidden="true"
      >
        <div className="hero-background-gradient" />
        <div className="hero-textile-pattern" />
        <div className="hero-light-beam" />
      </div>

      {/* =====================================================
          GOLD CORNERS
          ===================================================== */}

      <GoldCorner position="top-left" />
      <GoldCorner position="top-right" />
      <GoldCorner position="bottom-left" />
      <GoldCorner position="bottom-right" />

      {/* =====================================================
          LEFT EDITORIAL PANEL
          ===================================================== */}

      <div
        ref={panelRef}
        className="hero-editorial-panel"
      >
        <div className="hero-panel-pattern" />

        <div className="hero-copy-v2">

          {/* EYEBROW */}

          <div
            ref={eyebrowRef}
            className="hero-eyebrow-v2"
          >
            <span className="eyebrow-line" />

            <span>
              ROOTED IN TRADITION · DESIGNED FOR TODAY
            </span>

            <span className="eyebrow-line" />
          </div>

          {/* TITLE */}

          <h1
            ref={titleRef}
            className="hero-title-v2"
          >
            <span className="title-ivory">
              DHAAGA-E
            </span>

            <span className="title-gold">
              JASHN
            </span>
          </h1>

          {/* HINDI */}

          <p
            ref={hindiRef}
            className="hero-hindi-v2"
          >
            धागा-ए-जश्न
          </p>

          {/* DESCRIPTION */}

          <p
            ref={subtitleRef}
            className="hero-description-v2"
          >
            Where every thread tells a story of celebration,
            craft, and the timeless beauty of Indian textile
            heritage.
          </p>

          {/* BUTTONS */}

          <div
            ref={buttonsRef}
            className="hero-buttons-v2"
          >
            <Link
              href="/shop"
              className="hero-primary-button"
            >
              <span>
                EXPLORE COLLECTION
              </span>

              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </Link>

            <Link
              href="#story"
              className="hero-secondary-button"
            >
              OUR STORY
            </Link>
          </div>
        </div>
      </div>

      {/* =====================================================
          ROTATING EMBLEM
          ===================================================== */}

      <div
        ref={emblemRef}
        className="hero-emblem-v2"
      >

        {/* OUTER DECORATIVE RING */}

        <div
          ref={outerRingRef}
          className="emblem-outer-ring"
        >
          <span className="emblem-dot emblem-dot-top" />
          <span className="emblem-dot emblem-dot-right" />
          <span className="emblem-dot emblem-dot-bottom" />
          <span className="emblem-dot emblem-dot-left" />

          <span className="emblem-diamond emblem-diamond-top">
            ✦
          </span>

          <span className="emblem-diamond emblem-diamond-bottom">
            ✦
          </span>
        </div>

        {/* INNER ROTATING RING */}

        <div
          ref={innerRingRef}
          className="emblem-inner-ring"
        >
          <span className="emblem-small-dot small-dot-top" />
          <span className="emblem-small-dot small-dot-bottom" />
        </div>

        {/* CENTER */}

        <div
          ref={emblemCenterRef}
          className="emblem-center"
        >
          <div className="emblem-center-glow" />

          <Image
            src="/images/brandmark.webp"
            alt="Dhaaga-e-Jashn"
            width={480}
            height={496}
            sizes="145px"
            className="emblem-brandmark"
            draggable={false}
            priority
          />
        </div>

        {/* VERTICAL LABEL */}

        <div className="emblem-vertical-label">
          DHAAGA-E-JASHN · 2026 ·
        </div>
      </div>

      {/* =====================================================
          LONG GOLD THREAD
          ===================================================== */}

      <div
        className="hero-thread-wrapper"
        aria-hidden="true"
      >
        <svg
          className="hero-thread-svg"
          viewBox="0 0 1800 430"
          preserveAspectRatio="none"
        >

          {/* Soft glow */}
          <path
            ref={threadGlowRef}
            className="hero-thread-glow"
            d="
              M -40 365
              C 120 300,
                210 400,
                370 375

              C 570 345,
                600 300,
                760 325

              C 880 345,
                890 410,
                1010 385

              C 1130 360,
                1160 235,
                1280 260

              C 1380 280,
                1420 375,
                1530 355

              C 1650 335,
                1680 180,
                1840 145
            "
          />

          {/* Main gold thread */}
          <path
            ref={threadRef}
            className="hero-thread-main"
            d="
              M -40 365
              C 120 300,
                210 400,
                370 375

              C 570 345,
                600 300,
                760 325

              C 880 345,
                890 410,
                1010 385

              C 1130 360,
                1160 235,
                1280 260

              C 1380 280,
                1420 375,
                1530 355

              C 1650 335,
                1680 180,
                1840 145
            "
          />

          {/* Small thread end */}
          <circle
            className="thread-end-dot"
            cx="1840"
            cy="145"
            r="4"
          />

          {/* Thread tassel */}
          <g className="thread-tassel">
            <line
              x1="1815"
              y1="143"
              x2="1815"
              y2="170"
            />

            <path
              d="
                M 1804 168
                L 1826 168
                L 1821 202
                L 1810 202
                Z
              "
            />
          </g>
        </svg>
      </div>

      {/* =====================================================
          SCROLL
          ===================================================== */}

      <div
        ref={scrollRef}
        className="hero-scroll-v2"
      >
        <span>
          SCROLL
        </span>

        <div className="scroll-line">
          <span />
        </div>
      </div>

    </section>
  )
}