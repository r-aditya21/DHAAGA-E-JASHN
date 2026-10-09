// Single place for site-wide settings. Everything optional is read from env so
// nothing here pretends to be a real address or profile that does not exist.

export const SITE = {
  name: 'Dhaaga-E-Jashn',
  tagline: 'Indian clothing rooted in tradition',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '',
  social: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '',
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || '',
    pinterest: process.env.NEXT_PUBLIC_PINTEREST_URL || '',
  },
} as const

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
