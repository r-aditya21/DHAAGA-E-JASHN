'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="shop-page">
      <section className="shop-content">
        <div className="shop-empty" role="alert">
          <h1 style={{ fontSize: '2.6rem' }}>Something went wrong</h1>
          <p>This page did not load properly. Try again, or head back to the store.</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
            <button type="button" className="btn-primary" onClick={reset}>
              Try again
            </button>
            <Link href="/" className="btn-outline-dark">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
