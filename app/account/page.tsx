'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Toast from '@/components/ui/Toast'
import BagCountManager from '@/components/ui/BagCountManager'
import { useAuth } from '@/context/AuthContext'
import { getMyOrders, Order } from '@/lib/api/orders'
import { getAddresses, Address } from '@/lib/api/addresses'
import { formatPrice } from '@/lib/format'

export default function AccountPage() {
  const router = useRouter()
  const { user, loading: authLoading, logout, wishlistIds } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?redirect=/account')
        return
      }

      Promise.allSettled([getMyOrders(), getAddresses()]).then(([ordRes, addrRes]) => {
        if (ordRes.status === 'fulfilled') {
          setOrders(ordRes.value.orders || [])
        }
        if (addrRes.status === 'fulfilled') {
          setAddresses(addrRes.value.addresses || [])
        }
        setLoadingData(false)
      })
    }
  }, [user, authLoading, router])

  if (authLoading || (!user && loadingData)) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
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
              Loading your account...
            </p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (!user) return null

  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0]
  const recentOrders = orders.slice(0, 3)

  return (
    <>
      <Navbar />
      <BagCountManager />
      <Toast />

      <main style={{ minHeight: '75vh', padding: '48px 24px 100px', maxWidth: 1140, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(6,34,60,0.08)', paddingBottom: 28, marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C99A3D', fontWeight: 600 }}>
              {user.role === 'admin' ? 'ADMINISTRATOR PORTAL' : 'MY ACCOUNT'}
            </span>
            <h1
              style={{
                fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                fontSize: '2.8rem',
                color: '#06223C',
                fontWeight: 500,
                marginTop: 4,
              }}
            >
              Namaste, {user.name}
            </h1>
            <p style={{ fontSize: 14, color: '#496174' }}>{user.email}</p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {user.role === 'admin' && (
              <Link href="/admin" className="btn-primary" style={{ display: 'inline-flex' }}>
                ADMIN DASHBOARD
              </Link>
            )}
            <button
              type="button"
              onClick={async () => {
                await logout()
                router.push('/')
              }}
              className="btn-outline-dark"
              style={{ display: 'inline-flex' }}
            >
              SIGN OUT
            </button>
          </div>
        </div>

        {/* Account Quick Navigation */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20,
            marginBottom: 48,
          }}
        >
          <Link
            href="/account/orders"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(6,34,60,0.08)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              transition: 'border-color 0.2s',
            }}
          >
            <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C99A3D', fontWeight: 600 }}>
              ORDER HISTORY
            </span>
            <span style={{ fontSize: 24, fontWeight: 600, color: '#06223C' }}>
              {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
            </span>
            <span style={{ fontSize: 13, color: '#496174', marginTop: 'auto' }}>
              Track shipments &amp; invoices →
            </span>
          </Link>

          <Link
            href="/account/addresses"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(6,34,60,0.08)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              transition: 'border-color 0.2s',
            }}
          >
            <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C99A3D', fontWeight: 600 }}>
              SAVED ADDRESSES
            </span>
            <span style={{ fontSize: 24, fontWeight: 600, color: '#06223C' }}>
              {addresses.length} {addresses.length === 1 ? 'Address' : 'Addresses'}
            </span>
            <span style={{ fontSize: 13, color: '#496174', marginTop: 'auto' }}>
              Manage shipping destinations →
            </span>
          </Link>

          <Link
            href="/wishlist"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(6,34,60,0.08)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              transition: 'border-color 0.2s',
            }}
          >
            <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C99A3D', fontWeight: 600 }}>
              WISHLIST
            </span>
            <span style={{ fontSize: 24, fontWeight: 600, color: '#06223C' }}>
              {wishlistIds.length} {wishlistIds.length === 1 ? 'Item' : 'Items'}
            </span>
            <span style={{ fontSize: 13, color: '#496174', marginTop: 'auto' }}>
              View saved silhouettes →
            </span>
          </Link>
        </div>

        {/* Content Section: Recent Orders & Default Address */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 40 }}>
          {/* Recent Orders */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)", fontSize: '1.8rem', color: '#06223C', fontWeight: 500 }}>
                Recent Orders
              </h2>
              {orders.length > 0 && (
                <Link href="/account/orders" style={{ fontSize: 12, color: '#C99A3D', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  View All ({orders.length}) →
                </Link>
              )}
            </div>

            {recentOrders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {recentOrders.map((ord) => (
                  <div
                    key={ord._id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(6,34,60,0.08)',
                      padding: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#496174' }}>
                      <span>Order #{ord.orderNumber}</span>
                      <span>{new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0' }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#06223C' }}>
                          {ord.items.length} {ord.items.length === 1 ? 'Item' : 'Items'} · {formatPrice(ord.totalAmount)}
                        </p>
                        <p style={{ fontSize: 12, color: '#496174' }}>
                          Payment: {ord.paymentMethod.toUpperCase()} ({ord.paymentStatus})
                        </p>
                      </div>

                      <span
                        style={{
                          fontSize: 11,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          padding: '4px 10px',
                          background: ord.orderStatus === 'delivered' ? 'rgba(46,125,50,0.08)' : 'rgba(201,154,61,0.12)',
                          color: ord.orderStatus === 'delivered' ? '#2E7D32' : '#06223C',
                        }}
                      >
                        {ord.orderStatus}
                      </span>
                    </div>

                    <Link
                      href={`/order/${ord._id}`}
                      style={{ fontSize: 12, color: '#06223C', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      View Order Details &amp; Summary →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(6,34,60,0.08)', padding: '32px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#496174', marginBottom: 12 }}>You haven&apos;t placed any orders yet.</p>
                <Link href="/shop" className="btn-outline-dark" style={{ display: 'inline-flex' }}>
                  START SHOPPING
                </Link>
              </div>
            )}
          </div>

          {/* Default Shipping Address */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)", fontSize: '1.8rem', color: '#06223C', fontWeight: 500 }}>
                Default Shipping Address
              </h2>
              <Link href="/account/addresses" style={{ fontSize: 12, color: '#C99A3D', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Manage ({addresses.length}) →
              </Link>
            </div>

            {defaultAddress ? (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(6,34,60,0.08)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 16, color: '#06223C' }}>{defaultAddress.fullName}</strong>
                  <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#C99A3D', color: '#06223C', padding: '2px 8px', fontWeight: 700 }}>
                    DEFAULT
                  </span>
                </div>
                <p style={{ fontSize: 14, color: '#2b2b2b', lineHeight: 1.6 }}>
                  {defaultAddress.addressLine1}
                  {defaultAddress.addressLine2 ? `, ${defaultAddress.addressLine2}` : ''}<br />
                  {defaultAddress.city}, {defaultAddress.state} - {defaultAddress.pincode}<br />
                  {defaultAddress.country}
                </p>
                <p style={{ fontSize: 13, color: '#496174', marginTop: 4 }}>
                  Phone: {defaultAddress.phone}
                </p>
              </div>
            ) : (
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(6,34,60,0.08)', padding: '32px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#496174', marginBottom: 12 }}>No address saved yet.</p>
                <Link href="/account/addresses" className="btn-outline-dark" style={{ display: 'inline-flex' }}>
                  ADD ADDRESS
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
