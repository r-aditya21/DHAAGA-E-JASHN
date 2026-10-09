'use client'

import { useState } from 'react'
import {
  createCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory,
  type AdminCategory,
} from '@/lib/api/admin'
import { useFetch } from '@/lib/hooks/useFetch'
import {
  Badge,
  EmptyState,
  ErrorNote,
  Field,
  Modal,
  notify,
  PageHeader,
  Spinner,
} from '@/components/admin/ui'

type FormState = { id?: string; name: string; slug: string; description: string; image: string }

const EMPTY: FormState = { name: '', slug: '', description: '', image: '' }

export default function AdminCategoriesPage() {
  const { data, error, loading, reload } = useFetch(getAdminCategories)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const save = async () => {
    if (!form) return
    if (!form.name.trim()) return setFormError('Name is required')

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
      ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
    }

    setSaving(true)
    setFormError('')
    try {
      if (form.id) await updateCategory(form.id, payload)
      else await createCategory(payload)
      notify(form.id ? 'Category updated' : 'Category created')
      setForm(null)
      reload()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save category')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (c: AdminCategory) => {
    try {
      if (c.isActive) {
        const warning = c.productCount
          ? ` Its ${c.productCount} product${c.productCount > 1 ? 's' : ''} will disappear from the storefront too.`
          : ''
        if (!window.confirm(`Deactivate "${c.name}"?${warning}`)) return
        await deleteCategory(c._id)
        notify('Category deactivated')
      } else {
        await updateCategory(c._id, { isActive: true })
        notify('Category is live again')
      }
      reload()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update category')
    }
  }

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Group products so customers can browse them."
        action={
          <button className="adm-btn adm-btn--gold" onClick={() => { setFormError(''); setForm(EMPTY) }}>
            + New category
          </button>
        }
      />

      {error && <ErrorNote message={error} onRetry={reload} />}
      {!data && !error && <Spinner />}

      {data && (
        <div className="adm-tablewrap" style={{ opacity: loading ? 0.6 : 1 }}>
          {data.categories.length === 0 ? (
            <EmptyState title="No categories yet" hint="Create one before adding products." />
          ) : (
            <table className="adm-table">
              <thead>
                <tr><th>Name</th><th>Slug</th><th className="num">Products</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {data.categories.map((c) => (
                  <tr key={c._id}>
                    <td><strong>{c.name}</strong>{c.description && <span className="adm-sub">{c.description}</span>}</td>
                    <td>/{c.slug}</td>
                    <td className="num">{c.productCount}</td>
                    <td><Badge tone={c.isActive ? 'good' : 'neutral'}>{c.isActive ? 'Live' : 'Inactive'}</Badge></td>
                    <td className="actions">
                      <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => { setFormError(''); setForm({ id: c._id, name: c.name, slug: c.slug, description: c.description ?? '', image: c.image ?? '' }) }}>Edit</button>{' '}
                      <button className={`adm-btn adm-btn--sm ${c.isActive ? 'adm-btn--danger' : 'adm-btn--ghost'}`} onClick={() => toggle(c)}>
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {form && (
        <Modal
          title={form.id ? 'Edit category' : 'New category'}
          onClose={() => !saving && setForm(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
              <button className="adm-btn adm-btn--gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save category'}</button>
            </>
          }
        >
          <div className="adm-form">
            {formError && <ErrorNote message={formError} />}
            <Field label="Name"><input className="adm-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="URL slug" hint="Leave blank to generate from the name."><input className="adm-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
            <Field label="Description"><textarea className="adm-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Image URL or path"><input className="adm-input" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  )
}
