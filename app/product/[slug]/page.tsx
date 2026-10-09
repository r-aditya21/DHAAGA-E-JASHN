import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductDetail from '@/components/shop/ProductDetail'
import { fetchProduct } from '@/lib/api/server'
import { SITE } from '@/lib/site'
import type { Product } from '@/lib/api/products'

export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

const absolute = (url: string) => {
  try {
    return new URL(url, SITE.url).href
  } catch {
    return undefined
  }
}

const summarise = (text: string, max = 160) => {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { product, missing } = await fetchProduct(slug)

  if (!product) {
    return {
      title: missing ? 'Product not found' : 'Product',
      robots: missing ? { index: false, follow: false } : undefined,
    }
  }

  const description = summarise(product.description)
  const image = product.images?.[0] ? absolute(product.images[0]) : undefined

  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: 'website',
      title: product.name,
      description,
      url: `/product/${product.slug}`,
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: product.name,
      description,
      images: image ? [image] : undefined,
    },
  }
}

function productJsonLd(product: Product) {
  const inStock = (product.variants || []).some((variant) => variant.stock > 0)
  const images = (product.images || []).map(absolute).filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product._id,
    ...(images.length > 0 ? { image: images } : {}),
    brand: { '@type': 'Brand', name: SITE.name },
    offers: {
      '@type': 'Offer',
      url: `${SITE.url}/product/${product.slug}`,
      priceCurrency: 'INR',
      price: product.price,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const { product, missing } = await fetchProduct(slug)

  if (missing) notFound()

  return (
    <>
      <ProductDetail slug={slug} initialProduct={product} />

      {product && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productJsonLd(product)).replace(/</g, '\\u003c'),
          }}
        />
      )}
    </>
  )
}
