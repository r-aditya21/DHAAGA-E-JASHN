'use client'

import { useState } from 'react'
import { getAdminUsers, updateUserRole, type AdminUser } from '@/lib/api/admin'
import { useAuth } from '@/context/AuthContext'
import { useFetch } from '@/lib/hooks/useFetch'
import { useDebounced } from '@/lib/hooks/useDebounced'
import { formatDate } from '@/lib/format'
import { Badge, EmptyState, ErrorNote, notify, PageHeader, Pagination, Spinner } from '@/components/admin/ui'

export default function AdminUsersPage() {
  const { user: me } = useAuth()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'' | 'customer' | 'admin'>('')
  const [page, setPage] = useState(1)

  const q = useDebounced(search.trim())
  const { data, error, loading, reload } = useFetch(
    () => getAdminUsers({ page, limit: 15, q: q || undefined, role: role || undefined }),
    [page, q, role]
  )

  const isMe = (u: AdminUser) => u._id === (me?._id ?? me?.id)

  const changeRole = async (u: AdminUser) => {
    const next = u.role === 'admin' ? 'customer' : 'admin'
    const message =
      next === 'admin'
        ? `Give ${u.name} full admin access to the store?`
        : `Remove admin access from ${u.name}?`
    if (!window.confirm(message)) return

    try {
      await updateUserRole(u._id, next)
      notify(`${u.name} is now ${next === 'admin' ? 'an admin' : 'a customer'}`)
      reload()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not change role')
    }
  }

  return (
    <>
      <PageHeader title="Customers" subtitle="Everyone with an account, and who can manage the store." />

      <div className="adm-toolbar">
        <input className="adm-input" placeholder="Search name or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} aria-label="Search users" />
        <select className="adm-select" value={role} onChange={(e) => { setRole(e.target.value as typeof role); setPage(1) }} aria-label="Role">
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {error && <ErrorNote message={error} onRetry={reload} />}
      {!data && !error && <Spinner />}

      {data && (
        <>
          <div className="adm-tablewrap" style={{ opacity: loading ? 0.6 : 1 }}>
            {data.users.length === 0 ? (
              <EmptyState title="No users found" />
            ) : (
              <table className="adm-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Joined</th><th>Role</th><th /></tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u._id}>
                      <td><strong>{u.name}</strong>{isMe(u) && <span className="adm-sub">You</span>}</td>
                      <td>{u.email}</td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td><Badge tone={u.role === 'admin' ? 'gold' : 'neutral'}>{u.role}</Badge></td>
                      <td className="actions">
                        <button
                          className="adm-btn adm-btn--ghost adm-btn--sm"
                          disabled={isMe(u)}
                          title={isMe(u) ? 'You cannot change your own role' : undefined}
                          onClick={() => changeRole(u)}
                        >
                          {u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                        </button>
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
