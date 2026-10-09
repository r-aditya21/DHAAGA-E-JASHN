'use client'

import { useRef, useState } from 'react'
import { gsap } from '@/lib/gsapUtils'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const msgRef = useRef<HTMLParagraphElement>(null)

  const validateEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const valid = validateEmail(email.trim())
    setIsError(!valid)
    setMsg(
      valid
        ? 'Thank you for joining the thread. ✓'
        : 'Please enter a valid email address.'
    )

    if (valid) {
      setEmail('')
      // Animate success
      if (msgRef.current) {
        gsap.fromTo(
          msgRef.current,
          { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
        )
      }
    }
  }

  return (
    <section className="newsletter-section" id="newsletter">
      {/* Decorative textile pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 4px,
            rgba(201,154,61,0.04) 4px,
            rgba(201,154,61,0.04) 8px
          )`,
          pointerEvents: 'none',
        }}
      />

      {/* Gold top border */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(to right, transparent, rgba(201,154,61,0.5) 30%, rgba(201,154,61,0.5) 70%, transparent)',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Eyebrow */}
        <div className="section-eyebrow" style={{ marginBottom: 16 }}>
          <div className="eyebrow-line" />
          <span className="eyebrow-text" style={{ color: '#C99A3D' }}>
            JOIN THE FAMILY
          </span>
          <div className="eyebrow-line" />
        </div>

        <h2 className="newsletter-title">STAY IN THE THREAD</h2>
        <p className="newsletter-sub">
          Discover new collections, stories and special releases.
        </p>

        {/* Form */}
        <form
          ref={formRef}
          className="newsletter-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <label htmlFor="email-newsletter" className="sr-only">
            Email address
          </label>
          <input
            id="email-newsletter"
            type="email"
            className="newsletter-input"
            placeholder="Enter your email address"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="newsletter-submit">
            JOIN US
          </button>
        </form>

        {/* Message */}
        <p
          ref={msgRef}
          className={`newsletter-msg ${isError ? 'error' : ''}`}
          role="status"
          aria-live="polite"
        >
          {msg}
        </p>

        {/* Disclaimer */}
        <p
          style={{
            fontSize: 11,
            color: 'rgba(73,97,116,0.7)',
            marginTop: 12,
            letterSpacing: '0.05em',
          }}
        >
          By subscribing, you agree to receive occasional emails. Unsubscribe anytime.
        </p>
      </div>
    </section>
  )
}
