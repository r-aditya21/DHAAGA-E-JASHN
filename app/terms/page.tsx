import type { Metadata } from 'next'
import InfoPage from '@/components/layout/InfoPage'

export const metadata: Metadata = {
  title: 'Terms of service',
  description: 'The terms that apply when you shop with Dhaaga-E-Jashn.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms of service"
      intro="By placing an order you agree to these terms."
    >
      <h2>Orders</h2>
      <p>
        An order is confirmed once we accept it. We may cancel an order if an item is out of stock
        or if there is a pricing error, and we will let you know.
      </p>

      <h2>Prices and payment</h2>
      <p>
        Prices are in Indian rupees (INR). Shipping is added at checkout unless your order qualifies
        for free shipping. Cash on delivery is available for eligible addresses.
      </p>

      <h2>Your account</h2>
      <p>
        Keep your sign-in details to yourself. You are responsible for activity on your account.
      </p>

      <h2>Returns</h2>
      <p>See our shipping and returns page for how delivery, returns and refunds work.</p>

      <p className="info-note">
          This page is a starting draft written for a small online clothing store. Check it
          against how your business actually operates, and have it reviewed before launch.
        </p>
    </InfoPage>
  )
}
