import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="shop-page">
        <section className="shop-content">
          <div className="shop-empty">
            <h1 style={{ fontSize: '2.6rem' }}>This page could not be found</h1>
            <p>The link may be old, or the piece may no longer be available.</p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
              <Link href="/shop" className="btn-primary">
                Browse all pieces
              </Link>
              <Link href="/" className="btn-outline-dark">
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
