'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Toast from '@/components/ui/Toast'
import BagCountManager from '@/components/ui/BagCountManager'
import { KurtaSilhouette } from '@/components/shop/ProductCard'
import { getMyOrders, Order } from '@/lib/api/orders'
import { useAuth } from '@/context/AuthContext'
import { formatPrice } from '@/lib/format'

export default function MyOrdersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?redirect=/account/orders')
        return
      }

      getMyOrders()
        .then((res) => {
          setOrders(res.orders || [])
        })
        .catch((err) => {
          setError(err?.message || 'Could not load orders')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [user, authLoading, router])

  return (
    <>
      <Navbar />
      <BagCountManager />
      <Toast />

      <main style={{ minHeight: '75vh', padding: '48px 24px 100px', maxWidth: 1040, margin: '0 auto' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: 28, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#496174' }}>
          <Link href="/account" style={{ color: 'inherit' }}>Account</Link>
          {' '}/ <span style={{ color: '#06223C', fontWeight: 600 }}>Order History</span>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 40 }}>
          <h1
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontSize: '2.8rem',
              color: '#06223C',
              fontWeight: 500,
            }}
          >
            Your Orders
          </h1>
          <p style={{ fontSize: 14, color: '#496174' }}>
            Review past purchases, current fulfillment status, and order summaries.
          </p>
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
              Retrieving orders...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="shop-empty">
            <span className="shop-empty-eyebrow">ERROR</span>
            <h2>Failed to load orders</h2>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="shop-empty" style={{ margin: '40px auto' }}>
            <span className="shop-empty-eyebrow">NO ORDERS YET</span>
            <h2>You have not placed any orders.</h2>
            <p>Explore our handcrafted collection to find your next favorite piece.</p>
            <Link href="/shop" className="btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>
              EXPLORE COLLECTION
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {orders.map((order) => {
              const statusColor =
                order.orderStatus === 'delivered'
                  ? '#2E7D32'
                  : order.orderStatus === 'cancelled'
                  ? '#C33'
                  : '#C99A3D'

              return (
                <div
                  key={order._id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(6,34,60,0.08)',
                    boxShadow: '0 4px 16px rgba(6,34,60,0.02)',
                    padding: '24px 28px',
                  }}
                >
                  {/* Order Top Bar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 16,
                      borderBottom: '1px solid rgba(6,34,60,0.06)',
                      paddingBottom: 16,
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#496174' }}>
                        ORDER NUMBER
                      </span>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#06223C' }}>
                        {order.orderNumber}
                      </p>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#496174' }}>
                        ORDER DATE
                      </span>
                      <p style={{ fontSize: 14, color: '#06223C' }}>
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#496174' }}>
                        TOTAL AMOUNT
                      </span>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#06223C' }}>
                        {formatPrice(order.totalAmount)}
                      </p>
                    </div>

                    <div>
                      <span
                        style={{
                          fontSize: 11,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          padding: '4px 12px',
                          background: `${statusColor}18`,
                          color: statusColor,
                          display: 'inline-block',
                        }}
                      >
                        {order.orderStatus}
                      </span>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                    {order.items.map((item) => (
                      <div
                        key={item._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                        }}
                      >
                        <div
                          style={{
                            width: 54,
                            height: 64,
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
                              sizes="54px"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <KurtaSilhouette color="#E8DFD1" />
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#06223C' }}>
                            {item.productName}
                          </h4>
                          <p style={{ fontSize: 12, color: '#496174' }}>
                            Size: {item.size} &nbsp;·&nbsp; Color: {item.color} &nbsp;·&nbsp; Qty: {item.quantity}
                          </p>
                        </div>

                        <div style={{ fontSize: 14, fontWeight: 600, color: '#06223C' }}>
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom link */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(6,34,60,0.06)', paddingTop: 14 }}>
                    <Link
                      href={`/order/${order._id}`}
                      className="btn-outline-dark"
                      style={{ padding: '8px 18px', fontSize: 11, letterSpacing: '0.15em' }}
                    >
                      VIEW ORDER DETAILS
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}
