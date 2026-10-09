// lib/content.ts
// Static storefront content (nav/footer links, category tiles, copy).
// Live catalogue data comes from the API: see lib/api/.

export interface Category {
  id: string
  name: string
  color: string
  href: string
}

/* =========================================================
   CATEGORIES
   ========================================================= */

export const CATEGORIES: Category[] = [
  {
    id: 'kurtas',
    name: "Men's Kurtas",
    color: '#496174',
    href: '/men',
  },

  {
    id: 'kurtis',
    name: "Women's Kurtis",
    color: '#C8B79F',
    href: '/women',
  },

  {
    id: 'everyday',
    name: 'Everyday',
    color: '#E8DFD1',
    href: '/shop?category=everyday',
  },

  {
    id: 'festive',
    name: 'Festive',
    color: '#06223C',
    href: '/shop?category=festive',
  },
]

/* =========================================================
   SIZES
   ========================================================= */

export const SIZES = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
] as const

/* =========================================================
   INSTAGRAM COLORS
   ========================================================= */

export const INSTA_COLORS = [
  '#496174',
  '#E8DFD1',
  '#06223C',
  '#D8C6AA',
  '#2b2b2b',
  '#EFE8DA',
]

/* =========================================================
   CRAFT PILLARS
   ========================================================= */

export const CRAFT_PILLARS = [
  {
    number: '01',
    icon: 'wave',
    title: 'THOUGHTFUL FABRICS',
    desc:
      'Comfortable materials selected for everyday wear — soft against skin, mindful of origin.',
  },

  {
    number: '02',
    icon: 'loom',
    title: 'EASY SILHOUETTES',
    desc:
      'Classic Indian silhouettes designed for modern wardrobes and effortless movement.',
  },

  {
    number: '03',
    icon: 'repeat',
    title: 'MADE TO REPEAT',
    desc:
      'Pieces designed to become everyday favourites, worn again and again with ease.',
  },

  {
    number: '04',
    icon: 'thread',
    title: 'THE DHAAGA DETAIL',
    desc:
      'Subtle details inspired by Indian textile traditions — present but never overwhelming.',
  },
]

/* =========================================================
   NAVIGATION
   ========================================================= */

export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Women', href: '/women' },
  { label: 'Men', href: '/men' },
  { label: 'Collections', href: '/shop' },
  { label: 'About Us', href: '/#why' },
]

/* =========================================================
   FOOTER LINKS
   ========================================================= */

export const FOOTER_LINKS = {
  SHOP: [
    { label: 'Men', href: '/men' },
    { label: 'Women', href: '/women' },
    { label: 'Everyday', href: '/shop?category=everyday' },
    { label: 'Festive', href: '/shop?category=festive' },
    { label: 'All pieces', href: '/shop' },
  ],

  ABOUT: [
    { label: 'Our craft', href: '/#why' },
  ],

  HELP: [
    { label: 'Contact', href: '/contact' },
    { label: 'Shipping & returns', href: '/shipping-returns' },
    { label: 'Privacy policy', href: '/privacy' },
    { label: 'Terms of service', href: '/terms' },
  ],
} as const

/* =========================================================
   PRICE FORMATTER
   ========================================================= */
