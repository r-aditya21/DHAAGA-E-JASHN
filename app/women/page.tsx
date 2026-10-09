import type { Metadata } from 'next'
import CollectionPage from '@/components/shop/CollectionPage'
import { COLLECTIONS } from '@/lib/collections'

const config = COLLECTIONS.women

export const revalidate = 60

export const metadata: Metadata = {
  title: config.metaTitle,
  description: config.metaDescription,
  alternates: { canonical: config.path },
  openGraph: {
    title: config.metaTitle,
    description: config.metaDescription,
    url: config.path,
  },
}

export default function WomenPage() {
  return <CollectionPage section="women" />
}
