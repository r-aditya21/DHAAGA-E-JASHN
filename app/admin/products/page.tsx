'use client'

import { useState } from 'react'
import {
  createProduct,
  getAdminCategories,
  getAdminProductById,
  getAdminProducts,
  updateProduct,
} from '@/lib/api/admin'
import type { Product, ProductVariant } from '@/lib/api/products'
import { useFetch } from '@/lib/hooks/useFetch'
import { useDebounced } from '@/lib/hooks/useDebounced'
import { formatPrice } from '@/lib/format'
import {
  Badge,
  EmptyState,
  ErrorNote,
  Field,
  Modal,
  notify,
  PageHeader,
  Pagination,
  Spinner,
} from '@/components/admin/ui'

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

type FormState = {
  id?: string
  name: string
  slug: string
  description: string
  price: string
  category: string
  gender: 'men' | 'women' | 'unisex'
  images: string
  isActive: boolean
  variants: { size: string; color: string; stock: string }[]
}

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  description: '',
  price: '',
  category: '',
  gender: 'unisex',
  images: '',
  isActive: true,
  variants: [{ size: 'M', color: '', stock: '0' }],
}

const categoryId = (c: Product['category']) => (typeof c === 'string' ? c : c._id)
const categoryName = (c: Product['category']) => (typeof c === 'string' ? '—' : c.name)
const totalStock = (variants: ProductVariant[]) => variants.reduce((sum, v) => sum + v.stock, 0)

const toForm = (p: Product): FormState => ({
  id: p._id,
  name: p.name,
  slug: p.slug,
  description: p.description,
  price: String(p.price),
  category: categoryId(p.category),
  gender: p.gender ?? 'unisex',
  images: p.images.join('\n'),
  isActive: p.isActive,
  variants: p.variants.map((v) => ({ size: v.size, color: v.color, stock: String(v.stock) })),
})

/** Returns an error message, or the cleaned payload. */
function validate(form: FormState) {
  const price = Number(form.price)
  if (!form.name.trim()) return { error: 'Name is required' }
  if (!form.description.trim()) return { error: 'Description is required' }
  if (!form.price || !Number.isFinite(price) || price < 0) return { error: 'Enter a valid price' }
  if (!form.category) return { error: 'Choose a category' }

  const variants = form.variants.map((v) => ({ size: v.size.trim(), color: v.color.trim(), stock: Number(v.stock) }))
  if (variants.some((v) => !v.size || !v.color)) return { error: 'Every variant needs a size and a colour' }
  if (variants.some((v) => !Number.isInteger(v.stock) || v.stock < 0)) return { error: 'Stock must be a whole number, 0 or more' }

  const seen = new Set(variants.map((v) => `${v.size.toLowerCase()}|${v.color.toLowerCase()}`))
  if (seen.size !== variants.length) return { error: 'Two variants share the same size and colour' }

  return {
    data: {
      name: form.name.trim(),
      ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
      description: form.description.trim(),
      price,
      category: form.category,
      gender: form.gender,
      images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
      isActive: form.isActive,
      variants,
    },
  }
}

export default function AdminProductsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | 'active' | 'inactive'>('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const q = useDebounced(search.trim())
  const products = useFetch(
    () => getAdminProducts({ page, limit: 12, q: q || undefined, status: status || undefined }),
    [page, q, status]
  )
  const categories = useFetch(getAdminCategories)

  const openEdit = async (id: string) => {
    try {
      // Fresh copy, so we never save over stock that changed since the list loaded.
      const { product } = await getAdminProductById(id)
      setFormError('')
      setForm(toForm(product))
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not load product')
    }
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f))

  const setVariant = (i: number, patch: Partial<FormState['variants'][number]>) =>
    setForm((f) => (f ? { ...f, variants: f.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) } : f))

  const save = async () => {
    if (!form) return
    const result = validate(form)
    if (result.error || !result.data) return setFormError(result.error ?? 'Invalid form')

    setSaving(true)
    setFormError('')
    try {
      if (form.id) await updateProduct(form.id, result.data)
      else await createProduct(result.data)
      notify(form.id ? 'Product updated' : 'Product created')
      setForm(null)
      products.reload()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save product')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (p: Product) => {
    const next = !p.isActive
    if (!next && !window.confirm(`Hide "${p.name}" from the storefront?`)) return
    try {
      await updateProduct(p._id, { isActive: next })
      notify(next ? 'Product is live again' : 'Product hidden')
      products.reload()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update product')
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Everything in your catalogue, including hidden items."
        action={
          <button
            className="adm-btn adm-btn--gold"
            onClick={() => { setFormError(''); setForm({ ...EMPTY_FORM, category: categories.data?.categories.find((c) => c.isActive)?._id ?? '' }) }}
          >
            + New product
          </button>
        }
      />

      <div className="adm-toolbar">
        <input className="adm-input" placeholder="Search products…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} aria-label="Search products" />
        <select className="adm-select" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1) }} aria-label="Visibility">
          <option value="">All products</option>
          <option value="active">Live</option>
          <option value="inactive">Hidden</option>
        </select>
      </div>

      {products.error && <ErrorNote message={products.error} onRetry={products.reload} />}
      {!products.data && !products.error && <Spinner />}

      {products.data && (
        <>
          <div className="adm-tablewrap" style={{ opacity: products.loading ? 0.6 : 1 }}>
            {products.data.products.length === 0 ? (
              <EmptyState title="No products found" hint="Add your first product with the button above." />
            ) : (
              <table className="adm-table">
                <thead>
                  <tr><th>Product</th><th>Category</th><th className="num">Price</th><th className="num">Stock</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {products.data.products.map((p) => {
                    const stock = totalStock(p.variants)
                    return (
                      <tr key={p._id}>
                        <td>
                          <div className="adm-cell">
                            {p.images[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img className="adm-thumb" src={p.images[0]} alt="" />
                            ) : (
                              <span className="adm-thumb adm-thumb--empty">◫</span>
                            )}
                            <span><strong>{p.name}</strong><span className="adm-sub">{p.variants.length} variant{p.variants.length === 1 ? '' : 's'} · /{p.slug}</span></span>
                          </div>
                        </td>
                        <td>{categoryName(p.category)}</td>
                        <td className="num">{formatPrice(p.price)}</td>
                        <td className="num"><Badge tone={stock === 0 ? 'bad' : stock <= 5 ? 'warn' : 'neutral'}>{stock}</Badge></td>
                        <td><Badge tone={p.isActive ? 'good' : 'neutral'}>{p.isActive ? 'Live' : 'Hidden'}</Badge></td>
                        <td className="actions">
                          <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => openEdit(p._id)}>Edit</button>{' '}
                          <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => toggleActive(p)}>{p.isActive ? 'Hide' : 'Show'}</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          <Pagination pagination={products.data.pagination} onPage={setPage} />
        </>
      )}

      {form && (
        <Modal
          wide
          title={form.id ? 'Edit product' : 'New product'}
          onClose={() => !saving && setForm(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
              <button className="adm-btn adm-btn--gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save product'}</button>
            </>
          }
        >
          <div className="adm-form">
            {formError && <ErrorNote message={formError} />}

            <div className="adm-row">
              <Field label="Name"><input className="adm-input" value={form.name} onChange={(e) => setField('name', e.target.value)} /></Field>
              <Field label="URL slug" hint="Leave blank to generate from the name."><input className="adm-input" value={form.slug} onChange={(e) => setField('slug', e.target.value)} /></Field>
            </div>

            <Field label="Description"><textarea className="adm-textarea" value={form.description} onChange={(e) => setField('description', e.target.value)} /></Field>

            <div className="adm-row">
              <Field label="Price (₹)"><input className="adm-input" type="number" min={0} value={form.price} onChange={(e) => setField('price', e.target.value)} /></Field>
              <Field label="Category">
                <select className="adm-select" value={form.category} onChange={(e) => setField('category', e.target.value)}>
                  <option value="">Select…</option>
                  {categories.data?.categories.map((c) => <option key={c._id} value={c._id}>{c.name}{c.isActive ? '' : ' (inactive)'}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Section" hint="Where it appears in the store. Unisex shows under both Men and Women.">
              <select className="adm-select" value={form.gender} onChange={(e) => setField('gender', e.target.value as FormState['gender'])}>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="unisex">Unisex</option>
              </select>
            </Field>

            <Field label="Image URLs or paths" hint="One per line. The first is the main image.">
              <textarea className="adm-textarea" value={form.images} onChange={(e) => setField('images', e.target.value)} />
            </Field>

            <div>
              <div className="adm-section" style={{ marginTop: 0 }}><h4>Variants &amp; stock</h4></div>
              {form.variants.map((v, i) => (
                <div className="adm-variant" key={i}>
                  <input className="adm-input" list="adm-sizes" placeholder="Size" value={v.size} onChange={(e) => setVariant(i, { size: e.target.value })} aria-label="Size" />
                  <input className="adm-input" placeholder="Colour" value={v.color} onChange={(e) => setVariant(i, { color: e.target.value })} aria-label="Colour" />
                  <input className="adm-input" type="number" min={0} value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} aria-label="Stock" />
                  <button type="button" className="adm-iconbtn" aria-label="Remove variant" disabled={form.variants.length === 1} onClick={() => setField('variants', form.variants.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
              <datalist id="adm-sizes">{SIZE_OPTIONS.map((s) => <option key={s} value={s} />)}</datalist>
              <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setField('variants', [...form.variants, { size: 'M', color: '', stock: '0' }])}>+ Add variant</button>
            </div>

            <label className="adm-check">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setField('isActive', e.target.checked)} />
              Visible on the storefront
            </label>
          </div>
        </Modal>
      )}
    </>
  )
}
