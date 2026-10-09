import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

// Shared shell for plain content pages (policies, contact).
export default function InfoPage({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main className="info-page">
        <article className="info-article">
          <h1>{title}</h1>
          {intro && <p className="info-intro">{intro}</p>}
          {children}
        </article>
      </main>
      <Footer />
    </>
  )
}
