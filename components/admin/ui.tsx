'use client'

import { ReactNode, useEffect } from 'react'
import type { PaginationMeta } from '@/lib/api/products'

/* ---- toast (reuses the global <Toast/> listener mounted in the admin layout) ---- */

export function notify(message: string) {
  window.dispatchEvent(new CustomEvent('dhaaga:toast', { detail: message }))
}

/* ---- layout bits ---- */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="adm-pagehead">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="adm-pagehead__action">{action}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="adm-stat">
      <span className="adm-stat__label">{label}</span>
      <strong className="adm-stat__value">{value}</strong>
      {hint && <span className="adm-stat__hint">{hint}</span>}
    </div>
  )
}

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info' | 'gold'

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`adm-badge adm-badge--${tone}`}>{children}</span>
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="adm-center" role="status">
      <span className="adm-spinner" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="adm-empty">
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
    </div>
  )
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="adm-error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

/* ---- modal ---- */

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div className="adm-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`adm-modal__panel${wide ? ' adm-modal__panel--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="adm-modal__head">
          <h2>{title}</h2>
          <button type="button" className="adm-iconbtn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="adm-modal__body">{children}</div>
        {footer && <footer className="adm-modal__foot">{footer}</footer>}
      </div>
    </div>
  )
}

/* ---- pagination ---- */

export function Pagination({
  pagination,
  onPage,
}: {
  pagination?: PaginationMeta
  onPage: (page: number) => void
}) {
  if (!pagination || pagination.pages <= 1) return null

  return (
    <nav className="adm-pager" aria-label="Pagination">
      <span>
        Page {pagination.page} of {pagination.pages} · {pagination.total} total
      </span>
      <div>
        <button
          type="button"
          className="adm-btn adm-btn--ghost adm-btn--sm"
          disabled={!pagination.hasPrev}
          onClick={() => onPage(pagination.page - 1)}
        >
          ← Prev
        </button>
        <button
          type="button"
          className="adm-btn adm-btn--ghost adm-btn--sm"
          disabled={!pagination.hasNext}
          onClick={() => onPage(pagination.page + 1)}
        >
          Next →
        </button>
      </div>
    </nav>
  )
}

/* ---- form field ---- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="adm-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

/* ---- order status → badge tone ---- */

export const STATUS_TONE: Record<string, Tone> = {
  pending: 'warn',
  confirmed: 'info',
  processing: 'info',
  shipped: 'gold',
  delivered: 'good',
  cancelled: 'bad',
  paid: 'good',
  failed: 'bad',
  refunded: 'neutral',
}
