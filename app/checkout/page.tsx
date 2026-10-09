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
import { getCart, CartItem } from '@/lib/api/cart'
import { getAddresses, createAddress, Address, AddressInput } from '@/lib/api/addresses'
import { createOrder } from '@/lib/api/orders'
import { useAuth } from '@/context/AuthContext'
import { formatPrice } from '@/lib/format'

const FREE_SHIPPING_THRESHOLD = 1499
const SHIPPING_FEE = 150

export default function CheckoutPage() {
  const router = useRouter()
  const { user, loading: authLoading, refreshCart } = useAuth()

  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [subtotal, setSubtotal] = useState(0)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')

  // New Address Form State
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [newAddress, setNewAddress] = useState<AddressInput>({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    isDefault: true,
  })

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod')
  const [loading, setLoading] = useState(true)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?redirect=/checkout')
        return
      }

      Promise.all([getCart(), getAddresses()])
        .then(([cartRes, addrRes]) => {
          const items = cartRes.cart?.items || []
          setCartItems(items)
          setSubtotal(cartRes.summary?.subtotal || 0)

          const addrs = addrRes.addresses || []
          setAddresses(addrs)

          if (addrs.length > 0) {
            const def = addrs.find((a) => a.isDefault) || addrs[0]
            setSelectedAddressId(def._id)
          } else {
            setShowNewAddressForm(true)
          }
        })
        .catch((err) => {
          setError(err?.message || 'Could not load checkout details')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [user, authLoading, router])

  const handleCreateAndSelectAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanPhone = newAddress.phone.replace(/^\+?91/, '').replace(/[\s-]/g, '')
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please provide a valid 10-digit Indian phone number')
      return
    }

    if (!/^[1-9]\d{5}$/.test(newAddress.pincode.trim())) {
      setError('Please provide a valid 6-digit Indian PIN code')
      return
    }

    try {
      const res = await createAddress({
        ...newAddress,
        phone: cleanPhone,
      })
      setAddresses((prev) => [res.address, ...prev])
      setSelectedAddressId(res.address._id)
      setShowNewAddressForm(false)
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: 'Address saved' })
      )
    } catch (err: any) {
      setError(err?.message || 'Failed to save address')
    }
  }

  const handlePlaceOrder = async () => {
    setError('')

    if (!selectedAddressId) {
      setError('Please select or add a shipping address')
      return
    }

    if (cartItems.length === 0) {
      setError('Your shopping bag is empty')
      return
    }

    try {
      setPlacingOrder(true)
      const res = await createOrder({
        addressId: selectedAddressId,
        paymentMethod,
      })

      await refreshCart()
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: 'Order placed successfully!' })
      )

      router.push(`/order/${res.order._id}`)
    } catch (err: any) {
      setError(err?.message || 'Failed to place order. Please check stock or address.')
    } finally {
      setPlacingOrder(false)
    }
  }

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE
  const totalAmount = subtotal + shipping

  return (
    <>
      <Navbar />
      <BagCountManager />
      <Toast />

      <main style={{ minHeight: '80vh', padding: '48px 24px 100px', maxWidth: 1140, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ width: 32, height: 1, background: '#C99A3D', opacity: 0.7 }} />
            <span style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C99A3D', fontWeight: 600 }}>
              SECURE CHECKOUT
            </span>
            <div style={{ width: 32, height: 1, background: '#C99A3D', opacity: 0.7 }} />
          </div>

          <h1
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontSize: '2.8rem',
              color: '#06223C',
              fontWeight: 500,
            }}
          >
            Complete Your Order
          </h1>
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
              Preparing checkout...
            </p>
          </div>
        )}

        {!loading && cartItems.length === 0 && (
          <div className="shop-empty" style={{ margin: '40px auto' }}>
            <span className="shop-empty-eyebrow">BAG IS EMPTY</span>
            <h2>Nothing to checkout</h2>
            <p>Your bag has no items. Add your favorite garments before checking out.</p>
            <Link href="/shop" className="btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>
              EXPLORE COLLECTION
            </Link>
          </div>
        )}

        {!loading && cartItems.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 48,
              alignItems: 'start',
            }}
          >
            {/* Left Column: Shipping Address & Payment Method */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
              {error && (
                <div
                  style={{
                    background: 'rgba(180, 40, 40, 0.08)',
                    border: '1px solid rgba(180, 40, 40, 0.25)',
                    color: '#900',
                    padding: '12px 16px',
                    fontSize: 13,
                    borderRadius: 2,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Step 1: Shipping Address */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(6,34,60,0.1)',
                  padding: '32px 28px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)", fontSize: '1.6rem', color: '#06223C', fontWeight: 500 }}>
                    1. Shipping Address
                  </h2>

                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                      style={{ fontSize: 12, color: '#C99A3D', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    >
                      {showNewAddressForm ? 'Select Saved' : '+ New Address'}
                    </button>
                  )}
                </div>

                {/* Saved addresses selector */}
                {!showNewAddressForm && addresses.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr._id
                      return (
                        <label
                          key={addr._id}
                          style={{
                            display: 'flex',
                            gap: 14,
                            padding: '16px 20px',
                            border: isSelected ? '2px solid #06223C' : '1px solid rgba(6,34,60,0.1)',
                            background: isSelected ? 'rgba(6,34,60,0.02)' : '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="addressSelect"
                            checked={isSelected}
                            onChange={() => setSelectedAddressId(addr._id)}
                            style={{ marginTop: 4 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong style={{ fontSize: 15, color: '#06223C' }}>{addr.fullName}</strong>
                              {addr.isDefault && (
                                <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C99A3D', fontWeight: 700 }}>
                                  DEFAULT
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: 13, color: '#2b2b2b', marginTop: 4, lineHeight: 1.5 }}>
                              {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}<br />
                              {addr.city}, {addr.state} - {addr.pincode}
                            </p>
                            <p style={{ fontSize: 12, color: '#496174', marginTop: 4 }}>
                              Phone: {addr.phone}
                            </p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}

                {/* New address inline form */}
                {showNewAddressForm && (
                  <form onSubmit={handleCreateAndSelectAddress} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={newAddress.fullName}
                          onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                          placeholder="Recipient's name"
                          style={{ width: '100%', padding: '10px', border: '1px solid rgba(6,34,60,0.2)', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                          Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                          placeholder="9876543210"
                          style={{ width: '100%', padding: '10px', border: '1px solid rgba(6,34,60,0.2)', fontSize: 13 }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                        Address Line 1 *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddress.addressLine1}
                        onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                        placeholder="House / Flat / Street"
                        style={{ width: '100%', padding: '10px', border: '1px solid rgba(6,34,60,0.2)', fontSize: 13 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        value={newAddress.addressLine2}
                        onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })}
                        placeholder="Area, Landmark"
                        style={{ width: '100%', padding: '10px', border: '1px solid rgba(6,34,60,0.2)', fontSize: 13 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          placeholder="Jaipur"
                          style={{ width: '100%', padding: '10px', border: '1px solid rgba(6,34,60,0.2)', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                          State *
                        </label>
                        <input
                          type="text"
                          required
                          value={newAddress.state}
                          onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                          placeholder="Rajasthan"
                          style={{ width: '100%', padding: '10px', border: '1px solid rgba(6,34,60,0.2)', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                          PIN Code *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={newAddress.pincode}
                          onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                          placeholder="302001"
                          style={{ width: '100%', padding: '10px', border: '1px solid rgba(6,34,60,0.2)', fontSize: 13 }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ marginTop: 8, padding: '10px 16px', fontSize: 11, letterSpacing: '0.15em', justifyContent: 'center' }}
                    >
                      USE THIS ADDRESS
                    </button>
                  </form>
                )}
              </div>

              {/* Step 2: Payment Method */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(6,34,60,0.1)',
                  padding: '32px 28px',
                }}
              >
                <h2 style={{ fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)", fontSize: '1.6rem', color: '#06223C', fontWeight: 500, marginBottom: 20 }}>
                  2. Payment Method
                </h2>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '18px 20px',
                    border: '2px solid #06223C',
                    background: 'rgba(6,34,60,0.02)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                  />
                  <div>
                    <strong style={{ fontSize: 15, color: '#06223C', display: 'block' }}>
                      Cash on Delivery (COD)
                    </strong>
                    <span style={{ fontSize: 13, color: '#496174' }}>
                      Pay with cash upon receiving your garments at your doorstep.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Right Column: Order Summary & Place Order */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(6,34,60,0.1)',
                padding: '36px 28px',
                boxShadow: '0 12px 32px rgba(6,34,60,0.04)',
                position: 'sticky',
                top: 100,
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                  fontSize: '1.8rem',
                  color: '#06223C',
                  fontWeight: 500,
                  marginBottom: 20,
                }}
              >
                Review Items ({cartItems.length})
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 260, overflowY: 'auto', marginBottom: 24, paddingRight: 6 }}>
                {cartItems.map((item) => (
                  <div key={item._id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div
                      style={{
                        width: 48,
                        height: 58,
                        background: '#E8DFD1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        flexShrink: 0,
                      }}
                    >
                      {item.product?.images && item.product.images.length > 0 && item.product.images[0].startsWith('http') ? (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name}
                          fill
                          sizes="48px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <KurtaSilhouette color="#E8DFD1" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#06223C' }}>{item.product?.name}</p>
                      <p style={{ fontSize: 12, color: '#496174' }}>
                        {item.size} / {item.color} &nbsp;·&nbsp; Qty: {item.quantity}
                      </p>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#06223C' }}>
                      {formatPrice((item.product?.price || 0) * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <hr style={{ border: 'none', height: 1, background: 'rgba(6,34,60,0.08)', marginBottom: 16 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: '#2b2b2b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Shipping Fee</span>
                  <span>{shipping === 0 ? <strong style={{ color: '#2E7D32' }}>FREE</strong> : formatPrice(shipping)}</span>
                </div>

                <hr style={{ border: 'none', height: 1, background: 'rgba(6,34,60,0.08)', margin: '4px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, color: '#06223C' }}>
                  <span>Total Payable</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={placingOrder || !selectedAddressId}
                onClick={handlePlaceOrder}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  marginTop: 28,
                  padding: '16px',
                  fontSize: 12,
                  letterSpacing: '0.2em',
                }}
              >
                {placingOrder ? 'CONFIRMING ORDER...' : 'PLACE ORDER (COD)'}
              </button>

              <p style={{ fontSize: 11, color: '#496174', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
                By placing your order, you agree to Dhaaga&apos;s Terms of Service and 7-day handcrafted return policy.
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}
