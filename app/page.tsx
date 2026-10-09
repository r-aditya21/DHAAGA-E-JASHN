import Navbar from '@/components/layout/Navbar'
import Hero from '@/components/home/Hero'
import BrandIntro from '@/components/home/BrandIntro'
import ProductGrid from '@/components/shop/ProductGrid'
import Categories from '@/components/home/Categories'
import Story from '@/components/home/Story'
import FeaturedCollection from '@/components/home/FeaturedCollection'
import BannerSection from '@/components/home/BannerSection'
import Craftsmanship from '@/components/home/Craftsmanship'
import Instagram from '@/components/home/Instagram'
import Newsletter from '@/components/home/Newsletter'
import CTA from '@/components/home/CTA'
import Footer from '@/components/layout/Footer'
import { fetchProducts } from '@/lib/api/server'

export const revalidate = 60

export default async function Home() {
  // One request for the newest pieces, one for the Everyday edit.
  const [latest, everyday] = await Promise.all([
    fetchProducts({ sort: 'newest', limit: 8 }),
    fetchProducts({ category: 'everyday', sort: 'newest', limit: 3 }),
  ])

  const latestProducts = latest?.products ?? []
  const newArrivals = latestProducts.slice(0, 4)
  const moreToLove = latestProducts.slice(4, 8)

  return (
    <>
      <Navbar />

      <main id="top">
        {/* 1. Hero */}
        <Hero />

        {/* 2. Brand intro quote */}
        {/* <BrandIntro /> */}

        {/* 3. New Arrivals */}
        <ProductGrid
          id="new"
          category="new"
          products={newArrivals}
          title="New Arrivals"
          subtitle="Made for your everyday jashn."
        />

        {/* 4. Shop by Category */}
        <Categories />

        {/* 5. Brand Story */}
        {/* <Story /> */}

        {/* 6. Featured Collection (dark navy section) */}
        <FeaturedCollection products={everyday?.products ?? []} />

        {/* 7. Bestsellers */}
        <ProductGrid
          id="best"
          category="bestseller"
          products={moreToLove}
          title="Most Loved"
          subtitle="Pieces you'll want to wear again and again."
        />

        {/* 8. Immersive banner */}
        <BannerSection />

        {/* 9. Craftsmanship / Why Dhaaga */}
        <Craftsmanship />

        {/* 10. Instagram */}
        <Instagram />

        {/* 11. Newsletter */}
        <Newsletter />

        {/* 12. CTA Section */}
        <CTA />
      </main>

      {/* 13. Footer */}
      <Footer />
    </>
  )
}
