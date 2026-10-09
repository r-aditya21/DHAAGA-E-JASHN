import type { Metadata } from 'next'
import InfoPage from '@/components/layout/InfoPage'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How Dhaaga-E-Jashn collects, uses and protects your personal information.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy policy"
      intro="This explains what we collect when you use the store, why, and the choices you have."
    >
      <h2>What we collect</h2>
      <ul>
        <li>Account details: your name and email address, and a password (stored only as a one-way hash).</li>
        <li>If you sign in with Google: your name and verified email address from Google.</li>
        <li>Order details: items, delivery addresses and phone numbers you give us for delivery.</li>
        <li>Wishlist and bag contents, so they are there when you come back.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To create your account, process and deliver orders, and send order updates.</li>
        <li>To keep the store secure and prevent misuse.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use one essential cookie to keep you signed in. It is not used for advertising.
      </p>

      <h2>Sharing</h2>
      <p>
        We share your delivery details with the courier that delivers your order, and with payment
        providers when online payment is available. We do not sell your personal information.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us to correct or delete your account information.
        {SITE.supportEmail ? (
          <>
            {' '}Write to <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
          </>
        ) : (
          <> Use the contact page to reach us.</>
        )}
      </p>

      <p className="info-note">
          This page is a starting draft written for a small online clothing store. Check it
          against how your business actually operates, and have it reviewed before launch.
        </p>
    </InfoPage>
  )
}
