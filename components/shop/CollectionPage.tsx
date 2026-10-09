import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CollectionView from '@/components/shop/CollectionView'
import { fetchProducts } from '@/lib/api/server'
import { COLLECTIONS, CollectionKey } from '@/lib/collections'
import { SITE } from '@/lib/site'

// Server component: fetches the first page so the section is in the HTML that
// search engines and slow connections receive, then hands over to the client
// for sorting and "show more".
export default async function CollectionPage({ section }: { section: CollectionKey }) {
  const config = COLLECTIONS[section]
  const data = await fetchProducts({ gender: section, sort: 'newest', limit: 24 })

  const products = data?.products ?? []

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: config.title,
    description: config.metaDescription,
    url: `${SITE.url}${config.path}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE.url}/product/${product.slug}`,
        name: product.name,
      })),
    },
  }

  return (
    <>
      <Navbar />

      <CollectionView
        config={config}
        initialProducts={products}
        initialPagination={data?.pagination ?? null}
        loadFailed={data === null}
      />

      <Footer />

      <script
        type="application/ld+json"
        // JSON.stringify output is safe here; "<" is escaped to avoid closing the tag early.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </>
  )
}
