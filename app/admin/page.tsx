'use client'

import Link from 'next/link'
import { getDashboardStats, getRecentOrders } from '@/lib/api/admin'
import { useFetch } from '@/lib/hooks/useFetch'
import { formatDateTime, formatPrice } from '@/lib/format'
import {
  Badge,
  ErrorNote,
  PageHeader,
  Spinner,
  StatCard,
  STATUS_TONE,
} from '@/components/admin/ui'

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export default function AdminOverviewPage() {
  const dash = useFetch(getDashboardStats)
  const recent = useFetch(getRecentOrders)

  if (!dash.data) {
    return (
      <>
        <PageHeader title="Overview" />
        {dash.error ? <ErrorNote message={dash.error} onRetry={dash.reload} /> : <Spinner />}
      </>
    )
  }

  const { stats, ordersByStatus, salesByDay, topProducts, lowStock, lowStockThreshold } = dash.data
  const maxRevenue = Math.max(...salesByDay.map((d) => d.revenue), 1)
  const maxStatus = Math.max(...Object.values(ordersByStatus), 1)
  const weekRevenue = salesByDay.slice(-7).reduce((sum, d) => sum + d.revenue, 0)
  const weekOrders = salesByDay.slice(-7).reduce((sum, d) => sum + d.orders, 0)

  return (
    <>
      <PageHeader title="Overview" subtitle="How the store is doing right now." />

      <div className="adm-grid adm-grid--stats">
        <StatCard label="Revenue (paid)" value={formatPrice(stats.totalRevenue)} hint={`${formatPrice(weekRevenue)} booked in 7 days`} />
        <StatCard label="Orders" value={stats.totalOrders} hint={`${weekOrders} in the last 7 days`} />
        <StatCard label="Needs action" value={stats.pendingOrders} hint="Pending orders" />
        <StatCard label="Products" value={stats.totalProducts} hint={`${stats.totalCategories} categories`} />
        <StatCard label="Customers" value={stats.totalUsers} />
        <StatCard label="Reviews" value={stats.totalReviews} />
      </div>

      <div className="adm-grid adm-grid--2">
        <section className="adm-card">
          <h3>Sales · last {salesByDay.length} days</h3>
          <div className="adm-bars" role="img" aria-label="Daily sales for the last 14 days">
            {salesByDay.map((day) => (
              <div className="adm-bars__col" key={day.date} title={`${shortDay(day.date)}: ${formatPrice(day.revenue)} · ${day.orders} orders`}>
                <div
                  className={`adm-bars__bar${day.revenue === 0 ? ' is-zero' : ''}`}
                  style={{ height: `${(day.revenue / maxRevenue) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="adm-legend">
            <span>{shortDay(salesByDay[0].date)}</span>
            <span>Cancelled orders excluded</span>
            <span>{shortDay(salesByDay[salesByDay.length - 1].date)}</span>
          </div>
        </section>

        <section className="adm-card">
          <h3>Order pipeline</h3>
          <div className="adm-meter">
            {Object.entries(ordersByStatus).map(([status, count]) => (
              <div className="adm-meter__row" key={status}>
                <span>{status}</span>
                <div className="adm-meter__track">
                  <div className="adm-meter__fill" style={{ width: `${(count / maxStatus) * 100}%` }} />
                </div>
                <b>{count}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="adm-grid adm-grid--even">
        <section className="adm-card">
          <h3>Best sellers</h3>
          {topProducts.length === 0 ? (
            <p className="adm-sub">No sales yet.</p>
          ) : (
            <ul className="adm-list">
              {topProducts.map((p) => (
                <li key={p.productId}>
                  <span>{p.name}</span>
                  <span>
                    <strong>{p.units}</strong> sold · {formatPrice(p.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-card">
          <h3>Low stock (≤ {lowStockThreshold})</h3>
          {lowStock.length === 0 ? (
            <p className="adm-sub">Every variant is comfortably stocked.</p>
          ) : (
            <ul className="adm-list">
              {lowStock.map((row) => (
                <li key={`${row.productId}-${row.size}-${row.color}`}>
                  <span>
                    {row.name}
                    <span className="adm-sub">
                      {row.size} · {row.color}
                    </span>
                  </span>
                  <Badge tone={row.stock === 0 ? 'bad' : 'warn'}>{row.stock === 0 ? 'Sold out' : `${row.stock} left`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="adm-card">
        <h3>Recent orders</h3>
        {recent.error && <ErrorNote message={recent.error} onRetry={recent.reload} />}
        {!recent.data && !recent.error && <Spinner />}
        {recent.data && recent.data.orders.length === 0 && <p className="adm-sub">No orders yet.</p>}
        {recent.data && recent.data.orders.length > 0 && (
          <div className="adm-tablewrap" style={{ border: 0 }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th>Status</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {recent.data.orders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <Link href={`/admin/orders?q=${order.orderNumber}`}>{order.orderNumber}</Link>
                    </td>
                    <td>{typeof order.user === 'string' ? '—' : order.user.name}</td>
                    <td>{formatDateTime(order.createdAt)}</td>
                    <td>
                      <Badge tone={STATUS_TONE[order.orderStatus]}>{order.orderStatus}</Badge>
                    </td>
                    <td className="num">{formatPrice(order.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
