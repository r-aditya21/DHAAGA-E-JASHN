import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import './globals.css'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from '@/context/AuthContext'
import { AuthModalProvider } from '@/context/AuthModalContext'
import SkipLink from '@/components/ui/SkipLink'
import { SITE } from '@/lib/site'

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

const DESCRIPTION =
  'Dhaaga-E-Jashn brings the beauty of Indian craftsmanship into everyday dressing. Shop contemporary kurtas and kurtis designed with deep respect for tradition and a love for modern silhouettes.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Indian Clothing Rooted in Tradition`,
    template: `%s | ${SITE.name}`,
  },
  description: DESCRIPTION,
  applicationName: SITE.name,
  keywords: [
    'Dhaaga-E-Jashn',
    'Indian clothing',
    'kurta',
    'kurti',
    'Indian fashion',
    'handloom',
    'traditional clothing',
    'festive wear',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: 'en_IN',
    title: `${SITE.name} — Indian Clothing Rooted in Tradition`,
    description:
      'Where every thread tells a story. Premium Indian kurtas and kurtis crafted for everyday celebrations.',
    images: [{ url: '/images/og.jpg', width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — Indian Clothing Rooted in Tradition`,
    description: DESCRIPTION,
    images: ['/images/og.jpg'],
  },
  icons: {
    icon: [{ url: '/images/brandmark-icon.png', type: 'image/png' }],
    apple: [{ url: '/images/brandmark-icon.png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#06223C',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <SkipLink />
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
          <AuthProvider>
            <AuthModalProvider>{children}</AuthModalProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  )
}
