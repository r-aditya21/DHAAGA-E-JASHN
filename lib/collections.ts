// Copy and settings for the dedicated Men and Women sections.

export type CollectionKey = 'men' | 'women'

export interface CollectionConfig {
  key: CollectionKey
  path: string
  title: string
  metaTitle: string
  metaDescription: string
  intro: string
  /** Colour of the hero panel and whether it is a dark surface. */
  panelColor: string
  panelDark: boolean
  other: { label: string; href: string }
}

export const COLLECTIONS: Record<CollectionKey, CollectionConfig> = {
  men: {
    key: 'men',
    path: '/men',
    title: 'Kurtas for men',
    metaTitle: "Men's kurtas",
    metaDescription:
      "Shop men's kurtas from Dhaaga-E-Jashn: classic Indian silhouettes in soft, breathable fabrics, made for everyday wear and easy to dress up for a celebration.",
    intro:
      'Classic silhouettes in soft, breathable fabrics. Made for everyday wear, and easy to dress up when there is something to celebrate.',
    panelColor: '#06223C',
    panelDark: true,
    other: { label: "Women's kurtis", href: '/women' },
  },
  women: {
    key: 'women',
    path: '/women',
    title: 'Kurtis for women',
    metaTitle: "Women's kurtis",
    metaDescription:
      "Shop women's kurtis from Dhaaga-E-Jashn: easy cuts in breathable cotton, made for movement and everyday wear, with details that carry into festive days.",
    intro:
      'Easy cuts in breathable cotton, made for movement. Everyday pieces with quiet details that carry into festive days.',
    panelColor: '#D8C6AA',
    panelDark: false,
    other: { label: "Men's kurtas", href: '/men' },
  },
}
