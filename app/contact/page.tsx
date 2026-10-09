import type { Metadata } from 'next'
import InfoPage from '@/components/layout/InfoPage'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with Dhaaga-E-Jashn about an order, a size or anything else.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  const { supportEmail, social } = SITE

  return (
    <InfoPage
      title="Contact"
      intro="Questions about an order, a size or a fabric? Write to us and we will help."
    >
      {supportEmail ? (
        <>
          <h2>Email</h2>
          <p>
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </p>
        </>
      ) : (
        <p className="info-note">
          No contact email is set yet. Add NEXT_PUBLIC_SUPPORT_EMAIL to the environment to show it here.
        </p>
      )}

      {social.instagram && (
        <>
          <h2>Instagram</h2>
          <p>
            <a href={social.instagram} target="_blank" rel="noopener noreferrer">
              Message us on Instagram
            </a>
          </p>
        </>
      )}
    </InfoPage>
  )
}
