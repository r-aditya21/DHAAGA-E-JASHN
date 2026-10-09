'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Toast from '@/components/ui/Toast'
import { Spinner } from '@/components/admin/ui'
import './admin.css'

const NAV = [
  { label: 'Overview', href: '/admin', icon: '◧' },
  { label: 'Orders', href: '/admin/orders', icon: '▤' },
  { label: 'Products', href: '/admin/products', icon: '◫' },
  { label: 'Categories', href: '/admin/categories', icon: '▦' },
  { label: 'Reviews', href: '/admin/reviews', icon: '★' },
  { label: 'Customers', href: '/admin/users', icon: '☺' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const isAdmin = user?.role === 'admin'

  // Single guard for every /admin/* page. (The API enforces this too; this
  // only decides what the browser shows.)
  useEffect(() => {
    if (loading) return
    if (!user) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    else if (!isAdmin) router.replace('/account')
  }, [loading, user, isAdmin, pathname, router])

  if (loading || !isAdmin) {
    return (
      <div className="adm adm--gate">
        <Spinner label="Checking access…" />
      </div>
    )
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <div className="adm">
      <aside className={`adm-side${menuOpen ? ' is-open' : ''}`}>
        <Link href="/admin" className="adm-brand" onClick={() => setMenuOpen(false)}>
          <span className="adm-brand__mark">धा</span>
          <span>
            Dhaaga
            <small>Admin</small>
          </span>
        </Link>

        <nav className="adm-nav" aria-label="Admin">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? 'is-active' : ''}
              aria-current={isActive(item.href) ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="adm-side__foot">
          <Link href="/" target="_blank" rel="noreferrer">
            View storefront ↗
          </Link>
          <div className="adm-user">
            <span title={user?.email}>{user?.name}</span>
            <button
              type="button"
              onClick={async () => {
                await logout()
                router.replace('/login')
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-topbar">
          <button
            type="button"
            className="adm-iconbtn"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ☰
          </button>
          <span>Dhaaga Admin</span>
        </header>
        <main className="adm-content">{children}</main>
      </div>

      {menuOpen && <div className="adm-scrim" onClick={() => setMenuOpen(false)} />}
      <Toast />
    </div>
  )
}
