'use client'

import { useState } from 'react'
import { deleteAdminReview, getAdminReviews, setReviewApproval } from '@/lib/api/admin'
import type { Review } from '@/lib/api/reviews'
import { useFetch } from '@/lib/hooks/useFetch'
import { formatDate } from '@/lib/format'
import { Badge, EmptyState, ErrorNote, notify, PageHeader, Pagination, Spinner } from '@/components/admin/ui'

type Filter = 'all' | 'visible' | 'hidden'

const nameOf = (r: Review) => (typeof r.user === 'string' ? '—' : r.user.name)
const productOf = (r: Review) => (typeof r.product === 'string' ? '—' : r.product.name)

export default function AdminReviewsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)

  const { data, error, loading, reload } = useFetch(
    () => getAdminReviews({ page, limit: 12, approved: filter === 'all' ? undefined : filter === 'visible' }),
    [page, filter]
  )

  const toggle = async (r: Review) => {
    try {
      await setReviewApproval(r._id, !r.isApproved)
      notify(r.isApproved ? 'Review hidden from the storefront' : 'Review is now visible')
      reload()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update review')
    }
  }

  const remove = async (r: Review) => {
    if (!window.confirm('Permanently delete this review? This cannot be undone.')) return
    try {
      await deleteAdminReview(r._id)
      notify('Review deleted')
      reload()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not delete review')
    }
  }

  return (
    <>
      <PageHeader title="Reviews" subtitle="Moderate what customers say about your products." />

      <div className="adm-toolbar">
        <select className="adm-select" value={filter} onChange={(e) => { setFilter(e.target.value as Filter); setPage(1) }} aria-label="Visibility">
          <option value="all">All reviews</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      {error && <ErrorNote message={error} onRetry={reload} />}
      {!data && !error && <Spinner />}

      {data && (
        <>
          <div className="adm-tablewrap" style={{ opacity: loading ? 0.6 : 1 }}>
            {data.reviews.length === 0 ? (
              <EmptyState title="No reviews here" />
            ) : (
              <table className="adm-table">
                <thead>
                  <tr><th>Product</th><th>Customer</th><th>Rating</th><th>Review</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {data.reviews.map((r) => (
                    <tr key={r._id}>
                      <td>{productOf(r)}<span className="adm-sub">{formatDate(r.createdAt)}</span></td>
                      <td>{nameOf(r)}{r.verifiedPurchase && <span className="adm-sub">Verified purchase</span>}</td>
                      <td aria-label={`${r.rating} out of 5`} style={{ color: 'var(--gold)', whiteSpace: 'nowrap' }}>{'★'.repeat(r.rating)}<span style={{ color: '#d8d0c0' }}>{'★'.repeat(5 - r.rating)}</span></td>
                      <td style={{ maxWidth: 340 }}>{r.comment}</td>
                      <td><Badge tone={r.isApproved ? 'good' : 'neutral'}>{r.isApproved ? 'Visible' : 'Hidden'}</Badge></td>
                      <td className="actions">
                        <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => toggle(r)}>{r.isApproved ? 'Hide' : 'Approve'}</button>{' '}
                        <button className="adm-btn adm-btn--danger adm-btn--sm" onClick={() => remove(r)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Pagination pagination={data.pagination} onPage={setPage} />
        </>
      )}
    </>
  )
}
