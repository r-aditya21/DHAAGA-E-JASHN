import type { Metadata } from 'next'
import InfoPage from '@/components/layout/InfoPage'

export const metadata: Metadata = {
  title: 'Shipping and returns',
  description: 'Delivery, shipping fees, returns and refunds at Dhaaga-E-Jashn.',
  alternates: { canonical: '/shipping-returns' },
}

export default function ShippingReturnsPage() {
  return (
    <InfoPage
      title="Shipping and returns"
      intro="How your order reaches you, and what to do if something is not right."
    >
      <h2>Shipping</h2>
      <p>
        Orders above a minimum value ship free, and a flat fee applies below it. You can see the
        exact amount at checkout before you place the order.
      </p>

      <h2>Cash on delivery</h2>
      <p>You pay the courier when the order arrives.</p>

      <h2>Cancelling an order</h2>
      <p>
        You can ask us to cancel an order until it has shipped. Once it has shipped, use the return
        process below.
      </p>

      <h2>Returns and refunds</h2>
      <p>
        Add your return window, conditions and refund timeline here. These details depend on your
        business, so they are left for you to fill in.
      </p>

      <p className="info-note">
          This page is a starting draft written for a small online clothing store. Check it
          against how your business actually operates, and have it reviewed before launch.
        </p>
    </InfoPage>
  )
}
