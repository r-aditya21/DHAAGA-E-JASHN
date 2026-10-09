'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Toast from '@/components/ui/Toast'
import BagCountManager from '@/components/ui/BagCountManager'
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  Address,
  AddressInput,
} from '@/lib/api/addresses'
import { useAuth } from '@/context/AuthContext'

const INITIAL_FORM: AddressInput = {
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  isDefault: false,
}

export default function AddressesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<AddressInput>(INITIAL_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadAddresses = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await getAddresses()
      setAddresses(res.addresses || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load addresses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?redirect=/account/addresses')
        return
      }
      loadAddresses()
    }
  }, [user, authLoading, router])

  const openAddModal = () => {
    setEditingId(null)
    setFormData({
      ...INITIAL_FORM,
      isDefault: addresses.length === 0,
    })
    setFormError('')
    setShowModal(true)
  }

  const openEditModal = (addr: Address) => {
    setEditingId(addr._id)
    setFormData({
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      country: addr.country || 'India',
      isDefault: addr.isDefault,
    })
    setFormError('')
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this address?')) return
    try {
      await deleteAddress(id)
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: 'Address deleted' })
      )
      loadAddresses()
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: err?.message || 'Delete failed' })
      )
    }
  }

  const handleSetDefault = async (addr: Address) => {
    if (addr.isDefault) return
    try {
      await updateAddress(addr._id, { isDefault: true })
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: 'Default address updated' })
      )
      loadAddresses()
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('dhaaga:toast', { detail: err?.message || 'Update failed' })
      )
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Validate phone
    const cleanPhone = formData.phone.replace(/^\+?91/, '').replace(/[\s-]/g, '')
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setFormError('Please provide a valid 10-digit Indian phone number')
      return
    }

    // Validate pincode
    if (!/^[1-9]\d{5}$/.test(formData.pincode.trim())) {
      setFormError('Please provide a valid 6-digit Indian PIN code')
      return
    }

    try {
      setSubmitting(true)

      if (editingId) {
        await updateAddress(editingId, {
          ...formData,
          phone: cleanPhone,
        })
        window.dispatchEvent(
          new CustomEvent('dhaaga:toast', { detail: 'Address updated successfully' })
        )
      } else {
        await createAddress({
          ...formData,
          phone: cleanPhone,
        })
        window.dispatchEvent(
          new CustomEvent('dhaaga:toast', { detail: 'Address added successfully' })
        )
      }

      setShowModal(false)
      loadAddresses()
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save address')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />
      <BagCountManager />
      <Toast />

      <main style={{ minHeight: '75vh', padding: '48px 24px 100px', maxWidth: 1040, margin: '0 auto' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: 28, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#496174' }}>
          <Link href="/account" style={{ color: 'inherit' }}>Account</Link>
          {' '}/ <span style={{ color: '#06223C', fontWeight: 600 }}>Saved Addresses</span>
        </div>

        {/* Title & Add Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 40 }}>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                fontSize: '2.8rem',
                color: '#06223C',
                fontWeight: 500,
              }}
            >
              Saved Addresses
            </h1>
            <p style={{ fontSize: 14, color: '#496174' }}>
              Manage shipping destinations for swift, seamless checkouts.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="btn-primary"
            style={{ display: 'inline-flex' }}
          >
            + ADD NEW ADDRESS
          </button>
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
              Loading addresses...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="shop-empty">
            <span className="shop-empty-eyebrow">ERROR</span>
            <h2>Failed to load addresses</h2>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && addresses.length === 0 && (
          <div className="shop-empty" style={{ margin: '40px auto' }}>
            <span className="shop-empty-eyebrow">NO SAVED ADDRESSES</span>
            <h2>You haven&apos;t added any addresses.</h2>
            <p>Add your home or office address to make ordering effortless.</p>
            <button
              type="button"
              onClick={openAddModal}
              className="btn-primary"
              style={{ display: 'inline-flex', marginTop: 16 }}
            >
              ADD AN ADDRESS
            </button>
          </div>
        )}

        {!loading && !error && addresses.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {addresses.map((addr) => (
              <div
                key={addr._id}
                style={{
                  background: '#FFFFFF',
                  border: addr.isDefault ? '2px solid #06223C' : '1px solid rgba(6,34,60,0.1)',
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  position: 'relative',
                  boxShadow: '0 4px 16px rgba(6,34,60,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#06223C' }}>
                    {addr.fullName}
                  </h3>
                  {addr.isDefault && (
                    <span
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        background: '#C99A3D',
                        color: '#06223C',
                        fontWeight: 700,
                        padding: '2px 8px',
                      }}
                    >
                      DEFAULT
                    </span>
                  )}
                </div>

                <p style={{ fontSize: 14, color: '#2b2b2b', lineHeight: 1.6 }}>
                  {addr.addressLine1}
                  {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}<br />
                  {addr.city}, {addr.state} - {addr.pincode}<br />
                  {addr.country}
                </p>

                <p style={{ fontSize: 13, color: '#496174' }}>
                  Phone: <strong>{addr.phone}</strong>
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 16, marginTop: 'auto', paddingTop: 14, borderTop: '1px solid rgba(6,34,60,0.06)', fontSize: 12 }}>
                  <button
                    type="button"
                    onClick={() => openEditModal(addr)}
                    style={{ color: '#06223C', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    Edit
                  </button>

                  {!addr.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr)}
                      style={{ color: '#C99A3D', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      Make Default
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(addr._id)}
                    style={{ color: '#A33', fontWeight: 500, marginLeft: 'auto' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Address Form Modal */}
      {showModal && (
        <div className="modal-overlay open" role="dialog" aria-modal="true">
          <div className="modal-box" style={{ maxWidth: 540, padding: 36 }}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowModal(false)}
            >
              ✕
            </button>

            <h3 style={{ fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)", fontSize: '1.8rem', color: '#06223C', marginBottom: 4 }}>
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h3>
            <p style={{ fontSize: 13, color: '#496174', marginBottom: 20 }}>
              Ensure your shipping address is accurate for timely delivery.
            </p>

            {formError && (
              <div style={{ background: 'rgba(180,40,40,0.08)', border: '1px solid rgba(180,40,40,0.2)', color: '#900', padding: '8px 12px', fontSize: 13, marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Recipient's name"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(6,34,60,0.2)', background: '#FFF' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                    10-digit Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(6,34,60,0.2)', background: '#FFF' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                  Address Line 1 (Flat, House no., Street) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="e.g. Flat 402, Royal Residency"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(6,34,60,0.2)', background: '#FFF' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                  Address Line 2 (Area, Landmark)
                </label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Near City Center"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(6,34,60,0.2)', background: '#FFF' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Jaipur"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(6,34,60,0.2)', background: '#FFF' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Rajasthan"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(6,34,60,0.2)', background: '#FFF' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                    6-digit PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="302001"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(6,34,60,0.2)', background: '#FFF' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06223C', fontWeight: 600, marginBottom: 4 }}>
                    Country
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formData.country || 'India'}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(6,34,60,0.1)', background: '#F0EBE0', color: '#666' }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#06223C', cursor: 'pointer', marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
                Set as my default shipping address
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: 10 }}
              >
                {submitting ? 'SAVING ADDRESS...' : 'SAVE ADDRESS'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}
