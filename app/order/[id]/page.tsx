'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Toast from '@/components/ui/Toast'
import BagCountManager from '@/components/ui/BagCountManager'
import { KurtaSilhouette } from '@/components/shop/ProductCard'
import { getOrderById, Order } from '@/lib/api/orders'
import { useAuth } from '@/context/AuthContext'
import { formatPrice } from '@/lib/format'

export default function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace(`/login?redirect=/order/${id}`)
        return
      }

      getOrderById(id)
        .then((res) => {
          setOrder(res.order)
        })
        .catch((err) => {
          setError(err?.message || 'Failed to retrieve order details')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [id, user, authLoading, router])

  return (
    <>
      <Navbar />
      <BagCountManager />
      <Toast />

      <main style={{ minHeight: '75vh', padding: '48px 24px 100px', maxWidth: 960, margin: '0 auto' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: 28, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#496174' }}>
          <Link href="/account" style={{ color: 'inherit' }}>Account</Link>
          {' '}/ <Link href="/account/orders" style={{ color: 'inherit' }}>Orders</Link>
          {' '}/ <span style={{ color: '#06223C', fontWeight: 600 }}>{order?.orderNumber || id}</span>
        </div>

        {loading && (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: '2px solid rgba(6,34,60,0.15)',
                borderTopColor: '#C99A3D',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#496174' }}>
              Retrieving order...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="shop-empty">
            <span className="shop-empty-eyebrow">ORDER UNAVAILABLE</span>
            <h2>Could not load order</h2>
            <p>{error}</p>
            <Link href="/account/orders" className="btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>
              VIEW MY ORDERS
            </Link>
          </div>
        )}

        {!loading && order && (
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(6,34,60,0.1)', padding: '40px 36px', boxShadow: '0 8px 32px rgba(6,34,60,0.04)' }}>
            {/* Confirmation Banner */}
            <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(6,34,60,0.08)', paddingBottom: 32, marginBottom: 32 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'rgba(46,125,50,0.1)',
                  color: '#2E7D32',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  margin: '0 auto 16px',
                  fontWeight: 700,
                }}
              >
                ✓
              </div>

              <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C99A3D', fontWeight: 600 }}>
                ORDER CONFIRMED
              </span>

              <h1
                style={{
                  fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                  fontSize: '2.6rem',
                  color: '#06223C',
                  fontWeight: 500,
                  marginTop: 6,
                }}
              >
                Thank you for your order
              </h1>

              <p style={{ fontSize: 14, color: '#496174', marginTop: 8 }}>
                Order <strong>#{order.orderNumber}</strong> placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Order Status Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 20,
                background: 'rgba(232, 223, 209, 0.3)',
                padding: '20px 24px',
                marginBottom: 36,
                border: '1px solid rgba(6,34,60,0.06)',
              }}
            >
              <div>
                <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#496174' }}>
                  Fulfillment Status
                </span>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#06223C', textTransform: 'uppercase', marginTop: 4 }}>
                  ● {order.orderStatus}
                </p>
              </div>

              <div>
                <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#496174' }}>
                  Payment Method
                </span>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#06223C', textTransform: 'uppercase', marginTop: 4 }}>
                  {order.paymentMethod} ({order.paymentStatus})
                </p>
              </div>

              <div>
                <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#496174' }}>
                  Estimated Delivery
                </span>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#06223C', marginTop: 4 }}>
                  3–5 Business Days
                </p>
              </div>
            </div>

            {/* Items List */}
            <h2 style={{ fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)", fontSize: '1.8rem', color: '#06223C', marginBottom: 20, fontWeight: 500 }}>
              Ordered Items
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
              {order.items.map((item) => (
                <div
                  key={item._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    padding: '16px',
                    border: '1px solid rgba(6,34,60,0.08)',
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 74,
                      background: '#E8DFD1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    {item.productImage && item.productImage.startsWith('http') ? (
                      <Image
                        src={item.productImage}
                        alt={item.productName}
                        fill
                        sizes="60px"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <KurtaSilhouette color="#E8DFD1" />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: '#06223C' }}>
                      {item.productName}
                    </h3>
                    <p style={{ fontSize: 13, color: '#496174' }}>
                      Size: <strong>{item.size}</strong> &nbsp;·&nbsp; Color: <strong>{item.color}</strong> &nbsp;·&nbsp; Quantity: <strong>{item.quantity}</strong>
                    </p>
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 700, color: '#06223C' }}>
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Details Grid: Shipping Address & Financial Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 36, borderTop: '1px solid rgba(6,34,60,0.08)', paddingTop: 28 }}>
              {/* Shipping Address */}
              <div>
                <h3 style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C99A3D', fontWeight: 700, marginBottom: 12 }}>
                  Shipping Address
                </h3>
                <p style={{ fontSize: 14, color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                  {order.shippingAddress.fullName}
                </p>
                <p style={{ fontSize: 14, color: '#2b2b2b', lineHeight: 1.6 }}>
                  {order.shippingAddress.addressLine1}
                  {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}<br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}<br />
                  {order.shippingAddress.country}
                </p>
                <p style={{ fontSize: 13, color: '#496174', marginTop: 8 }}>
                  Phone: {order.shippingAddress.phone}
                </p>
              </div>

              {/* Price Breakdown */}
              <div style={{ background: '#F8F5EF', padding: '24px', border: '1px solid rgba(6,34,60,0.08)' }}>
                <h3 style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#06223C', fontWeight: 700, marginBottom: 16 }}>
                  Payment Breakdown
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: '#2b2b2b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Items Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Shipping Charges</span>
                    <span>{order.shippingFee === 0 ? <strong style={{ color: '#2E7D32' }}>FREE</strong> : formatPrice(order.shippingFee)}</span>
                  </div>

                  <hr style={{ border: 'none', height: 1, background: 'rgba(6,34,60,0.1)', margin: '6px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, color: '#06223C' }}>
                    <span>Total Amount</span>
                    <span>{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap' }}>
              <Link href="/shop" className="btn-primary">
                CONTINUE SHOPPING
              </Link>
              <Link href="/account/orders" className="btn-outline-dark">
                VIEW ALL ORDERS
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}
