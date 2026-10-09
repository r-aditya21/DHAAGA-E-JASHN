'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FOOTER_LINKS } from '@/lib/content'
import { SITE } from '@/lib/site'

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const SOCIALS = [
  {
    label: 'Instagram',
    href: SITE.social.instagram,
    icon: (
      <svg {...iconProps}>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: SITE.social.facebook,
    icon: (
      <svg {...iconProps}>
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
      </svg>
    ),
  },
  {
    label: 'Pinterest',
    href: SITE.social.pinterest,
    icon: (
      <svg {...iconProps}>
        <path d="M12 2C6.5 2 2 6.5 2 12c0 4.2 2.6 7.8 6.3 9.3-.1-.8-.1-2.1.1-3l1.5-6.4s-.4-.8-.4-2c0-1.9 1.1-3.3 2.5-3.3 1.2 0 1.8.9 1.8 2 0 1.2-.8 3-1.2 4.7-.3 1.4.7 2.5 2 2.5 2.4 0 4-3 4-6.5 0-2.7-1.8-4.6-4.9-4.6-3.4 0-5.6 2.6-5.6 5.2 0 1 .3 1.6.7 2.1.1.1.1.2.1.3-.1.3-.2 1-.2 1-.1.2-.2.3-.4.2-1.5-.6-2.2-2.4-2.2-4.4 0-3.3 2.9-7.6 8.6-7.6 4.7 0 7.7 3.5 7.7 7.2 0 5.3-3 9.1-6.5 9.1-1.3 0-2.5-.7-2.9-1.5l-.9 3.5c-.3 1.1-.9 2.3-1.4 3.1.8.3 1.6.4 2.4.4C17.5 22 22 17.5 22 12 22 6.5 17.5 2 12 2z" />
      </svg>
    ),
  },
]

export default function Footer() {
  const socials = SOCIALS.filter((item) => item.href)

  return (
    <footer className="site-footer">
      <div className="footer-top">
        {/* Brand column */}
        <div className="footer-brand">
          <Link href="/" aria-label="Dhaaga-e-Jashn home">
            <Image
              src="/images/logo.webp"
              alt="Dhaaga-e-Jashn"
              width={160}
              height={62}
              className="footer-logo"
            />
          </Link>
          <p>
            Rooted in tradition. Crafted with love.
            Made for your everyday celebrations.
          </p>

          {/* Brandmark ornament */}
          <div style={{ marginTop: 24, opacity: 0.35 }}>
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none" aria-hidden>
              <path d="M50 50 C50 50 44 30 50 15 C56 30 50 50 50 50Z" fill="#C99A3D" />
              <path d="M50 50 C50 50 56 70 50 85 C44 70 50 50 50 50Z" fill="#C99A3D" />
              <path d="M50 50 C50 50 30 44 15 50 C30 56 50 50 50 50Z" fill="#C99A3D" />
              <path d="M50 50 C50 50 70 56 85 50 C70 44 50 50 50 50Z" fill="#C99A3D" />
              <circle cx="50" cy="50" r="5" fill="#C99A3D" />
            </svg>
          </div>
        </div>

        {/* Link columns */}
        {(Object.keys(FOOTER_LINKS) as Array<keyof typeof FOOTER_LINKS>).map((col) => (
          <div key={col}>
            <h4 className="footer-col-title">{col}</h4>
            {FOOTER_LINKS[col].map((link) => (
              <Link key={link.label} href={link.href} className="footer-link">
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom: copyright + social */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 24,
          borderTop: '1px solid rgba(232,223,209,0.1)',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <p className="footer-copy" style={{ margin: 0, textAlign: 'left', padding: 0, border: 'none' }}>
          © {new Date().getFullYear()} Dhaaga-E-Jashn. All rights reserved.
        </p>

        {/* Social icons: only shown when a real URL is configured */}
        {socials.length > 0 && (
          <div style={{ display: 'flex', gap: 16 }}>
            {socials.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.label}
                className="footer-social"
              >
                {item.icon}
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  )
}
