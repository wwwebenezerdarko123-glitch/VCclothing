import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  LoaderCircle,
  LogOut,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import {
  deleteProduct,
  fetchAdminProducts,
  removeProductImages,
  saveProduct,
  uploadProductImage,
  type ProductInput,
  type StoreProduct,
} from './lib/products'
import { supabase, supabaseConfigurationError } from './lib/supabase'

type WelcomeNote = { id: string; place: string; date: string }

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category: '',
  sizes: '',
  stock: '0',
  published: false,
}

function StudioBrand({ light = false }: { light?: boolean }) {
  return (
    <a className={`brand${light ? ' brand-light' : ''}`} href="/" aria-label="VC Clothing home">
      <img src="/logo.jpeg" alt="" />
      <span className="brand-wordmark"><strong>VC CLOTHING</strong><small>MADE FOR YOUR MOMENT</small></span>
    </a>
  )
}

function StudioFrame({ children, onSignOut }: { children: ReactNode; onSignOut?: () => void }) {
  return (
    <div className="admin-page">
      <header className="admin-header">
        <a className="back-link" href="/"><ArrowLeft size={16} /> Back to the shop</a>
        <StudioBrand />
        {onSignOut
          ? <button className="admin-signout" type="button" onClick={onSignOut}>Sign out <LogOut size={13} /></button>
          : <span className="demo-status">STUDIO ACCESS</span>}
      </header>
      {children}
      <footer className="admin-footer"><StudioBrand light /><span>MADE WITH CARE IN ACCRA <span>✳</span></span></footer>
    </div>
  )
}

function AdminLogin({ onLogin, loading, error }: {
  onLogin: (email: string, password: string) => void
  loading: boolean
  error: string
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onLogin(email.trim(), password)
  }

  return (
    <StudioFrame>
      <main className="login-main">
        <section className="admin-panel login-panel">
          <span className="eyebrow">A LITTLE CORNER OF VC</span>
          <h1>Welcome<br /><em>back.</em></h1>
          <p>Sign in with your Supabase Auth administrator account to continue.</p>
          <form className="login-form" onSubmit={submit}>
            <label>EMAIL<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>PASSWORD<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <label className="remember-login">
              <input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              I confirm I am signing in to the VC Clothing studio
            </label>
            {error && <p className="admin-error" role="alert">{error}</p>}
            <button className="button button-dark" type="submit" disabled={loading || !confirmed}>
              {loading ? <><LoaderCircle className="spin" size={15} /> Signing in…</> : <>Continue to the studio <ArrowRight size={16} /></>}
            </button>
            <small>Your password is sent to Supabase Auth and is never stored by this website. Only users approved by the store-admin allowlist can enter.</small>
          </form>
        </section>
      </main>
    </StudioFrame>
  )
}

function readWelcomeNotes(): WelcomeNote[] {
  try {
    const saved = localStorage.getItem('vc-clothing-welcome-notes')
    return saved ? JSON.parse(saved) as WelcomeNote[] : []
  } catch (error) {
    console.error('Could not read visitor welcome notes.', error)
    return []
  }
}

function ProductStudio({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [notes, setNotes] = useState(readWelcomeNotes)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [currentImages, setCurrentImages] = useState<string[]>([])
  const [primaryImage, setPrimaryImage] = useState(0)
  const [newImages, setNewImages] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState('')

  const imagePreviews = useMemo(() => newImages.map((file) => URL.createObjectURL(file)), [newImages])
  useEffect(() => () => imagePreviews.forEach((url) => URL.revokeObjectURL(url)), [imagePreviews])

  function existingImageUrl(path: string) {
    for (const product of products) {
      const index = product.image_urls.indexOf(path)
      if (index >= 0) return product.display_image_urls?.[index] ?? ''
    }
    return ''
  }

  async function refreshProducts() {
    try {
      setProducts(await fetchAdminProducts())
      setError('')
    } catch (loadError) {
      console.error('Could not load admin products.', loadError)
      setError('Products could not be loaded. Check your database policies and connection, then try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void fetchAdminProducts().then((rows) => {
      if (active) {
        setProducts(rows)
        setError('')
      }
    }).catch((loadError: unknown) => {
      console.error('Could not load admin products.', loadError)
      if (active) setError('Products could not be loaded. Check your database policies and connection, then try again.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
    setCurrentImages([])
    setPrimaryImage(0)
    setNewImages([])
    setUploadProgress('')
    setError('')
  }

  function editProduct(product: StoreProduct) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      category: product.category,
      sizes: product.available_sizes.join(', '),
      stock: String(product.stock_quantity),
      published: product.is_published,
    })
    setCurrentImages(product.image_urls)
    setPrimaryImage(0)
    setNewImages([])
    setMessage('')
    setError('')
    document.getElementById('studio-product-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function selectImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (selected.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      setError('Use JPG, PNG, or WebP photos.')
      return
    }
    if (selected.some((file) => file.size > 10 * 1024 * 1024)) {
      setError('Each photo must be 10 MB or smaller.')
      return
    }
    setNewImages((current) => [...current, ...selected])
    setError('')
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const price = Number(form.price)
    const stock = Number(form.stock)
    const sizes = [...new Set(form.sizes.split(',').map((size) => size.trim()).filter(Boolean))]
    if (!form.name.trim() || !form.description.trim() || !form.category.trim() || !Number.isFinite(price) || price <= 0) {
      setError('Enter a name, description, category, and a price greater than zero.')
      return
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setError('Stock must be a whole number that is zero or higher.')
      return
    }
    if (currentImages.length + newImages.length === 0) {
      setError('Add at least one product photo before saving.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    const uploadedPaths: string[] = []
    try {
      for (let index = 0; index < newImages.length; index += 1) {
        setUploadProgress(`Uploading photo ${index + 1} of ${newImages.length}…`)
        uploadedPaths.push(await uploadProductImage(newImages[index], session.user.id))
      }
      const combinedImages = [...currentImages, ...uploadedPaths]
      const orderedImages = combinedImages.length
        ? [combinedImages[primaryImage] ?? combinedImages[0], ...combinedImages.filter((_, index) => index !== primaryImage)]
        : []
      const payload: ProductInput = {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        category: form.category.trim(),
        available_sizes: sizes,
        stock_quantity: stock,
        image_urls: orderedImages,
        is_published: form.published,
      }
      await saveProduct(payload, editingId ?? undefined)
      const removedImages = editingId
        ? products.find((product) => product.id === editingId)?.image_urls.filter((path) => !currentImages.includes(path)) ?? []
        : []
      let cleanupWarning = false
      if (removedImages.length) {
        try {
          await removeProductImages(removedImages)
        } catch (cleanupError) {
          console.error('Product saved, but removed photos could not be deleted from Storage.', cleanupError)
          cleanupWarning = true
        }
      }
      setMessage(cleanupWarning
        ? 'Product saved, but an old photo could not be removed from Storage.'
        : editingId ? 'Your product has been updated.' : 'Your new piece has been added.')
      resetForm()
      await refreshProducts()
    } catch (saveError) {
      console.error('Could not save the product.', saveError)
      if (uploadedPaths.length) {
        try {
          await removeProductImages(uploadedPaths)
        } catch (cleanupError) {
          console.error('Could not clean up photos uploaded during the failed save.', cleanupError)
        }
      }
      setError(saveError instanceof Error ? saveError.message : 'The product could not be saved. Please try again.')
    } finally {
      setSaving(false)
      setUploadProgress('')
    }
  }

  async function remove(product: StoreProduct) {
    if (!window.confirm(`Delete “${product.name}” from the store? This cannot be undone.`)) return
    setError('')
    setMessage('')
    try {
      await deleteProduct(product.id)
      let cleanupWarning = false
      try {
        await removeProductImages(product.image_urls)
      } catch (cleanupError) {
        console.error('Product deleted, but its photos could not be removed from Storage.', cleanupError)
        cleanupWarning = true
      }
      setMessage(cleanupWarning
        ? `${product.name} was deleted, but one or more photos could not be removed.`
        : `${product.name} was deleted.`)
      if (editingId === product.id) resetForm()
      await refreshProducts()
    } catch (deleteError) {
      console.error('Could not delete the product.', deleteError)
      setError('The product could not be deleted. Check authorization and try again.')
    }
  }

  function removeWelcomeNote(note: WelcomeNote) {
    try {
      const remaining = notes.filter((item) => item.id !== note.id)
      localStorage.setItem('vc-clothing-welcome-notes', JSON.stringify(remaining))
      setNotes(remaining)
    } catch (storageError) {
      console.error('Could not remove the visitor welcome note.', storageError)
      setError('The visitor note could not be removed from this device.')
    }
  }

  return (
    <StudioFrame onSignOut={onSignOut}>
      <main className="admin-main">
        <div className="admin-intro">
          <div><span className="eyebrow">YOUR LITTLE CORNER OF VC</span><h1>The studio<br /><em>edit.</em></h1><p>Manage your pieces and stock from the studio, home, or your phone.</p></div>
          <div className="admin-stat"><span>PIECES IN THE COLLECTION</span><strong>{String(products.length).padStart(2, '0')}</strong></div>
        </div>
        <div className="demo-warning"><Check size={17} /><p><strong>Signed in as {session.user.email}.</strong> Product changes are stored in Supabase. Uploads and product changes are protected by your database and Storage policies.</p></div>
        {message && <div className="admin-success" role="status"><Check size={16} /> {message}<button className="icon-button" onClick={() => setMessage('')} aria-label="Dismiss message"><X size={15} /></button></div>}
        {error && <p className="admin-error" role="alert">{error}</p>}
        <div className="admin-columns">
          <section className="admin-panel add-panel" id="studio-product-form">
            <div className="panel-title"><span className="eyebrow">{editingId ? 'REFINE THE DETAILS' : 'GIVE IT A PLACE'}</span><h2>{editingId ? 'Edit this piece' : 'Add a new piece'}</h2><p>Product details, photos, availability, and stock.</p></div>
            <form onSubmit={submitProduct} className="product-form">
              <div className="current-product-images">
                {currentImages.map((path, index) => (
                  <div className={`current-product-image${primaryImage === index ? ' primary-product-image' : ''}`} key={path}>
                    <img src={existingImageUrl(path)} alt={`Current product view ${index + 1}`} />
                    <button type="button" className="image-primary-button" onClick={() => setPrimaryImage(index)}>
                      {primaryImage === index ? 'PRIMARY PHOTO' : 'MAKE PRIMARY'}
                    </button>
                    <button type="button" className="remove-item" aria-label={`Remove current photo ${index + 1}`} onClick={() => {
                      setCurrentImages((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      setPrimaryImage(0)
                    }}><X size={14} /></button>
                  </div>
                ))}
                {imagePreviews.map((preview, index) => (
                  <div className={`current-product-image new-product-image${primaryImage === currentImages.length + index ? ' primary-product-image' : ''}`} key={`${newImages[index]?.name}-${index}`}>
                    <img src={preview} alt={`Selected product photo ${index + 1}`} />
                    <span className="image-view-label">NEW PHOTO</span>
                    <button type="button" className="image-primary-button" onClick={() => setPrimaryImage(currentImages.length + index)}>MAKE PRIMARY</button>
                    <button type="button" className="remove-item" aria-label={`Remove selected photo ${index + 1}`} onClick={() => setNewImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={14} /></button>
                  </div>
                ))}
              </div>
              <label className="image-picker">
                <ImagePlus size={17} /> Add clothing photos
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectImages} />
              </label>
              <label>PIECE NAME<input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. The Sunday Kaftan" /></label>
              <div className="form-row product-meta-row">
                <label>CATEGORY<input required maxLength={80} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Made to measure" /></label>
                <label>PRICE (GHS)<input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="850" /></label>
                <label>STOCK QUANTITY<input required type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label>
              </div>
              <label>AVAILABLE SIZES<input value={form.sizes} onChange={(event) => setForm({ ...form, sizes: event.target.value })} placeholder="S, M, L, XL (separate with commas)" /></label>
              <label>THE STORY BEHIND IT<textarea required maxLength={1000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Tell us what makes this piece special…" /></label>
              <label className="remember-login"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} /> Publish this product in the public collection</label>
              {uploadProgress && <p className="upload-progress" role="status"><LoaderCircle className="spin" size={15} /> {uploadProgress}</p>}
              <div className="product-form-actions">
                <button className="button button-dark" type="submit" disabled={saving}>
                  {saving ? <><LoaderCircle className="spin" size={15} /> Saving…</> : <>{editingId ? 'Save product changes' : 'Add to the collection'} <ArrowRight size={16} /></>}
                </button>
                {editingId && <button className="button button-cancel" type="button" onClick={resetForm} disabled={saving}>Cancel edit</button>}
              </div>
            </form>
          </section>

          <section className="admin-panel inventory-panel">
            <div className="panel-title"><span className="eyebrow">ON THE RAIL</span><h2>Your collection</h2><p>{products.length} products in Supabase</p></div>
            {loading ? <p className="panel-empty">Loading products…</p> : (
              <div className="inventory-list">
                {products.map((product) => (
                  <article className="inventory-item inventory-product" key={product.id}>
                    <div className="inventory-thumbnails">
                      {product.image_urls[0] && <img src={product.display_image_urls?.[0]} alt="" />}
                      {product.image_urls[1] && <img src={product.display_image_urls?.[1]} alt="" />}
                    </div>
                    <div className="inventory-product-detail">
                      <strong>{product.name}</strong>
                      <span>{product.category} · {formatPrice(product.price)} · Stock {product.stock_quantity}</span>
                      <span className={product.is_published ? 'published-status' : 'unpublished-status'}>{product.is_published ? 'Published' : 'Unpublished'}</span>
                    </div>
                    <div className="inventory-actions">
                      <button className="remove-item" onClick={() => editProduct(product)} aria-label={`Edit ${product.name}`}><Pencil size={15} /></button>
                      <button className="remove-item" onClick={() => void remove(product)} aria-label={`Delete ${product.name}`}><Trash2 size={15} /></button>
                    </div>
                  </article>
                ))}
                {!products.length && <p className="panel-empty">No products yet. Add the first piece above.</p>}
              </div>
            )}
          </section>
        </div>

        <section className="admin-panel notes-panel">
          <div className="panel-title"><span className="eyebrow">A LITTLE HELLO FROM AFAR</span><h2>Visitor hellos <span className="note-count">{notes.length}</span></h2><p>Welcome-screen replies remain saved locally in this browser.</p></div>
          {notes.length
            ? <div className="notes-list">{notes.map((note) => (
              <article className="visitor-note" key={note.id}>
                <span className="visitor-pin">✳</span><div><strong>{note.place}</strong><span>{note.date}</span></div>
                <button className="remove-item" onClick={() => removeWelcomeNote(note)} aria-label={`Remove note from ${note.place}`}><Trash2 size={16} /></button>
              </article>
            ))}</div>
            : <div className="panel-empty">Your first hello is on its way. Notes are stored on the visitor's device only.</div>}
        </section>
      </main>
    </StudioFrame>
  )
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(price)
}

export default function AdminDashboard() {
  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(false)
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    if (!supabase) {
      return
    }
    let active = true

    async function checkAdminAccess(nextSession: Session | null) {
      if (!active) return
      setSession(nextSession)
      if (!nextSession) {
        setCheckingAdmin(false)
        setCheckingSession(false)
        return
      }
      setCheckingAdmin(true)
      try {
        const { data, error } = await supabase!.rpc('is_store_admin')
        if (error) throw error
        if (data !== true) {
          await supabase!.auth.signOut()
          if (active) {
            setSession(null)
            setLoginError('This account is not approved for VC Clothing studio access.')
          }
        }
      } catch (authError) {
        console.error('Could not verify store administrator access.', authError)
        if (active) {
          setSession(null)
          setLoginError('Administrator access could not be verified. Check the is_store_admin() function and its permissions.')
        }
        await supabase!.auth.signOut()
      } finally {
        if (active) {
          setCheckingAdmin(false)
          setCheckingSession(false)
        }
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => void checkAdminAccess(nextSession), 0)
    })
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error
      if (active && !data.session) setCheckingSession(false)
      if (active && data.session) void checkAdminAccess(data.session)
    }).catch((authError: unknown) => {
      console.error('Could not restore the Supabase session.', authError)
      if (active) {
        setLoginError('Your session could not be restored. Please sign in again.')
        setCheckingSession(false)
      }
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function login(email: string, password: string) {
    if (!supabase) return
    setCheckingAdmin(true)
    setLoginError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error('Supabase sign-in failed.', error)
        setLoginError('Sign-in failed. Check your email and password, then try again.')
        return
      }
      if (!data.session) {
        setLoginError('Supabase did not start a session. Please try again.')
        return
      }
      const { data: isAdmin, error: roleError } = await supabase.rpc('is_store_admin')
      if (roleError || isAdmin !== true) {
        if (roleError) console.error('Could not verify store administrator access.', roleError)
        await supabase.auth.signOut()
        setLoginError(roleError
          ? 'Administrator access could not be verified. Check your Supabase authorization setup.'
          : 'This account is not approved for VC Clothing studio access.')
      } else {
        setSession(data.session)
      }
    } catch (authError) {
      console.error('Supabase sign-in could not be completed.', authError)
      setLoginError('Sign-in could not be completed. Check your connection and try again.')
    } finally {
      setCheckingAdmin(false)
    }
  }

  async function logout() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Could not sign out from Supabase.', error)
      setLoginError('Sign-out failed. Please try again.')
      return
    }
    setSession(null)
    setLoginError('')
  }

  if (!supabase) {
    return (
      <StudioFrame>
        <main className="login-main"><section className="admin-panel login-panel">
          <span className="eyebrow">STUDIO CONNECTION</span>
          <h1>One small<br /><em>setup.</em></h1>
          <p>{supabaseConfigurationError}</p>
          <a className="text-link" href="/">Back to the shop <ArrowRight size={15} /></a>
        </section></main>
      </StudioFrame>
    )
  }

  if (checkingSession || checkingAdmin) {
    return <StudioFrame><main className="login-main"><p className="catalogue-notice"><LoaderCircle className="spin" size={15} /> Checking studio access…</p></main></StudioFrame>
  }

  if (!session) return <AdminLogin onLogin={(email, password) => void login(email, password)} loading={checkingAdmin} error={loginError} />
  return <ProductStudio session={session} onSignOut={() => void logout()} />
}
