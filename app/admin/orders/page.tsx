'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getAdminOrders, updateOrderStatus, type OrderStatus } from '@/lib/api/admin'
import type { Order } from '@/lib/api/orders'
import { useFetch } from '@/lib/hooks/useFetch'
import { useDebounced } from '@/lib/hooks/useDebounced'
import { formatDateTime, formatPrice } from '@/lib/format'
import {
  Badge,
  EmptyState,
  ErrorNote,
  Modal,
  notify,
  PageHeader,
  Pagination,
  Spinner,
  STATUS_TONE,
} from '@/components/admin/ui'

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
const FLOW: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
// Mirrors the API rule: an order can be cancelled until it has shipped.
const CANCELLABLE: OrderStatus[] = ['pending', 'confirmed', 'processing']

const nextStep = (status: OrderStatus): OrderStatus | null => {
  const i = FLOW.indexOf(status)
  return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null
}

const customerOf = (order: Order) =>
  typeof order.user === 'string' ? { name: '—', email: '' } : order.user

function OrdersView() {
  const params = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [status, setStatus] = useState('')
  const [payment, setPayment] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Order | null>(null)
  const [busy, setBusy] = useState(false)

  const q = useDebounced(search.trim())
  const { data, error, loading, reload } = useFetch(
    () => getAdminOrders({ page, limit: 15, q: q || undefined, status: status || undefined, paymentStatus: payment || undefined }),
    [page, q, status, payment]
  )

  const changeStatus = async (order: Order, next: OrderStatus) => {
    const verb = next === 'cancelled' ? 'Cancel' : `Mark as ${next}`
    const extra = next === 'cancelled' ? ' Stock will be returned to inventory.' : ''
    if (!window.confirm(`${verb} order ${order.orderNumber}?${extra}`)) return

    setBusy(true)
    try {
      const res = await updateOrderStatus(order._id, next)
      setSelected({ ...order, ...res.order, user: order.user })
      notify(`Order ${order.orderNumber} is now ${next}`)
      reload()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update order')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Orders" subtitle="Review, fulfil and cancel customer orders." />

      <div className="adm-toolbar">
        <input
          className="adm-input"
          placeholder="Search order number…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          aria-label="Search orders"
        />
        <select className="adm-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Order status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="adm-select" value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1) }} aria-label="Payment status">
          <option value="">Any payment</option>
          {['pending', 'paid', 'failed', 'refunded'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <ErrorNote message={error} onRetry={reload} />}
      {!data && !error && <Spinner />}

      {data && (
        <>
          <div className="adm-tablewrap" style={{ opacity: loading ? 0.6 : 1 }}>
            {data.orders.length === 0 ? (
              <EmptyState title="No orders found" hint="Try clearing the filters." />
            ) : (
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Order</th><th>Customer</th><th>Placed</th><th>Payment</th><th>Status</th><th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order) => (
                    <tr key={order._id} className="is-clickable" onClick={() => setSelected(order)}>
                      <td><strong>{order.orderNumber}</strong><span className="adm-sub">{order.items.length} item{order.items.length > 1 ? 's' : ''}</span></td>
                      <td>{customerOf(order).name}<span className="adm-sub">{customerOf(order).email}</span></td>
                      <td>{formatDateTime(order.createdAt)}</td>
                      <td><Badge tone={STATUS_TONE[order.paymentStatus]}>{order.paymentStatus}</Badge><span className="adm-sub">{order.paymentMethod.toUpperCase()}</span></td>
                      <td><Badge tone={STATUS_TONE[order.orderStatus]}>{order.orderStatus}</Badge></td>
                      <td className="num">{formatPrice(order.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Pagination pagination={data.pagination} onPage={setPage} />
        </>
      )}

      {selected && (
        <Modal
          wide
          title={`Order ${selected.orderNumber}`}
          onClose={() => setSelected(null)}
          footer={
            <>
              {CANCELLABLE.includes(selected.orderStatus) && (
                <button className="adm-btn adm-btn--danger" disabled={busy} onClick={() => changeStatus(selected, 'cancelled')}>
                  Cancel order
                </button>
              )}
              {nextStep(selected.orderStatus) && (
                <button className="adm-btn adm-btn--gold" disabled={busy} onClick={() => changeStatus(selected, nextStep(selected.orderStatus)!)}>
                  Mark as {nextStep(selected.orderStatus)}
                </button>
              )}
              {!nextStep(selected.orderStatus) && !CANCELLABLE.includes(selected.orderStatus) && (
                <span className="adm-sub">This order is {selected.orderStatus}. No further actions.</span>
              )}
            </>
          }
        >
          <dl className="adm-kv">
            <dt>Status</dt><dd><Badge tone={STATUS_TONE[selected.orderStatus]}>{selected.orderStatus}</Badge></dd>
            <dt>Payment</dt><dd><Badge tone={STATUS_TONE[selected.paymentStatus]}>{selected.paymentStatus}</Badge> via {selected.paymentMethod.toUpperCase()}</dd>
            <dt>Placed</dt><dd>{formatDateTime(selected.createdAt)}</dd>
            <dt>Customer</dt><dd>{customerOf(selected).name} {customerOf(selected).email && `· ${customerOf(selected).email}`}</dd>
          </dl>

          <div className="adm-section">
            <h4>Ship to</h4>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              {selected.shippingAddress.fullName} · {selected.shippingAddress.phone}<br />
              {selected.shippingAddress.addressLine1}{selected.shippingAddress.addressLine2 ? `, ${selected.shippingAddress.addressLine2}` : ''}<br />
              {selected.shippingAddress.city}, {selected.shippingAddress.state} {selected.shippingAddress.pincode}
            </p>
          </div>

          <div className="adm-section">
            <h4>Items</h4>
            <ul className="adm-list">
              {selected.items.map((item) => (
                <li key={item._id}>
                  <span>{item.productName}<span className="adm-sub">{item.size} · {item.color} · qty {item.quantity}</span></span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
              <li><span className="adm-sub">Subtotal</span><span>{formatPrice(selected.subtotal)}</span></li>
              <li><span className="adm-sub">Shipping</span><span>{selected.shippingFee ? formatPrice(selected.shippingFee) : 'Free'}</span></li>
              <li><strong>Total</strong><strong>{formatPrice(selected.totalAmount)}</strong></li>
            </ul>
          </div>
        </Modal>
      )}
    </>
  )
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <OrdersView />
    </Suspense>
  )
}
