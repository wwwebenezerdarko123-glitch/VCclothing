import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Heart,
  LoaderCircle,
  Menu,
  Minus,
  Plus,
  Ruler,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import AdminDashboard from './AdminDashboard'
import {
  createProductImageUrl,
  fetchPublishedProducts,
  type StoreProduct,
} from './lib/products'
import { supabase } from './lib/supabase'
import './App.css'

type Product = {
  id: string
  name: string
  category: string
  gender: 'Men' | 'Women' | 'Unisex'
  price: number
  description: string
  image: string
  imageBack?: string
  availableSizes?: string[]
  stockQuantity?: number
  imagePaths?: string[]
}

type WelcomeNote = {
  id: string
  place: string
  date: string
}

const productStorageKey = 'vc-clothing-products'
const noteStorageKey = 'vc-clothing-welcome-notes'
const welcomeStorageKey = 'vc-clothing-welcome-seen'
const ownerWhatsApp = '0531459738'
const ownerWhatsAppInternational = ownerWhatsApp.startsWith('0')
  ? `233${ownerWhatsApp.slice(1)}`
  : ownerWhatsApp
const ownerEmail = 'Ilesanmivictor26@gmail.com'

const starterProducts: Product[] = [
  {
    id: 'royal-blue-set',
    name: 'The Royal Blue Set',
    category: 'Statement pieces',
    gender: 'Men',
    price: 1850,
    description: 'A striking two-piece with intricate gold detailing, made for the moments worth remembering.',
    image: '/selling/gh%20760.jpg',
    imageBack: '/hero%20homepage/WhatsApp%20Image%202026-10-21%20at%205.56.05%20PM%20(1).jpeg',
  },
  {
    id: 'ivory-heritage',
    name: 'Ivory Heritage Kaftan',
    category: 'Made to measure',
    gender: 'Men',
    price: 1450,
    description: 'Quietly confident embroidery meets an easy, beautifully tailored silhouette.',
    image: '/selling/gh%20150.jpeg',
    imageBack: '/hero%20homepage/WhatsApp%20Image%202026-10-21%20at%205.56.05%20PM.jpeg',
  },
  {
    id: 'woven-story-shirt',
    name: 'Woven Story Shirt',
    category: 'Everyday elegance',
    gender: 'Men',
    price: 680,
    description: 'A crisp, considered shirt finished with a vivid woven print that tells its own story.',
    image: '/selling/gh%20650.png',
    imageBack: '/selling/gh%20140.jpeg',
  },
  {
    id: 'white-on-white',
    name: 'White on White',
    category: 'Everyday elegance',
    gender: 'Men',
    price: 720,
    description: 'Subtle texture, clean lines and thoughtful details make this one an instant favourite.',
    image: '/selling/gh%20140.jpeg',
    imageBack: '/selling/gh%20150.jpeg',
  },
]

const heroSlides = [
  {
    type: 'image',
    src: '/hero%20homepage/WhatsApp%20Image%202026-10-21%20at%205.26.17%20PM.jpeg',
    alt: 'The VC Clothing team in the atelier, surrounded by fabrics and handmade pieces',
    note: 'Every thread has a story.',
  },
  {
    type: 'image',
    src: '/hero%20homepage/WhatsApp%20Image%202026-10-21%20at%205.56.04%20PM.jpeg',
    alt: 'A guest wearing a beautifully detailed royal blue traditional outfit',
    note: 'Wear the feeling.',
  },
  {
    type: 'image',
    src: '/hero%20homepage/WhatsApp%20Image%202026-10-21%20at%205.56.05%20PM.jpeg',
    alt: 'A guest in a handcrafted white traditional look',
    note: 'Made to feel like you.',
  },
  {
    type: 'image',
    src: '/hero%20homepage/WhatsApp%20Image%202026-10-21%20at%205.56.05%20PM%20(1).jpeg',
    alt: 'A guest in a richly patterned blue ceremonial outfit',
    note: 'A little piece of home.',
  },
  {
    type: 'video',
    src: '/hero%20homepage/WhatsApp%20Video%202026-10-21%20at%205.26.17%20PM.mp4',
    alt: 'A moving glimpse inside the VC Clothing atelier',
    note: 'Made with you in mind.',
  },
]

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    maximumFractionDigits: 2,
  }).format(price)

function readStored<T,>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key)
  if (!saved) return fallback

  try {
    return JSON.parse(saved) as T
  } catch (error) {
    console.error(`Could not read ${key} from local storage.`, error)
    return fallback
  }
}

function saveStored<T,>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function readProducts() {
  return readStored<Product[]>(productStorageKey, starterProducts).map((product) => {
    const gender = product.gender ?? 'Men'
    const sample = starterProducts.find((starter) => starter.id === product.id)
      ?? starterProducts.find((starter) => starter.gender === gender && starter.imageBack)

    return {
      ...product,
      gender,
      imageBack: product.imageBack ?? sample?.imageBack,
    }
  })
}

function getProductImageUrl(product: Product) {
  if (!product.image || product.image.startsWith('data:')) return null
  return new URL(product.image, window.location.origin).href
}

async function mapStoreProduct(product: StoreProduct): Promise<Product> {
  const images = await Promise.all(product.image_urls.map(createProductImageUrl))
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    gender: product.gender,
    price: product.price,
    description: product.description,
    image: images[0] ?? '',
    imageBack: images[1],
    imagePaths: product.image_urls,
    availableSizes: product.available_sizes,
    stockQuantity: product.stock_quantity,
  }
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <a className={`brand${light ? ' brand-light' : ''}`} href="/" aria-label="VC Clothing home">
      <img src="/logo.jpeg" alt="" />
      <span className="brand-wordmark">
        <strong>VC CLOTHING</strong>
        <small>MADE FOR YOUR MOMENT</small>
      </span>
    </a>
  )
}

function WelcomeOverlay({ onClose }: { onClose: () => void }) {
  const [place, setPlace] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [offerExpanded, setOfferExpanded] = useState(false)
  const [offerName, setOfferName] = useState('')
  const [offerEmail, setOfferEmail] = useState('')
  const [offerError, setOfferError] = useState('')
  const [offerStatus, setOfferStatus] = useState('')

  async function submitWelcome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const answer = place.trim()
    if (!answer) {
      setError('Tell us where you are joining us from.')
      return
    }

    setIsSubmitting(true)
    await new Promise((resolve) => window.setTimeout(resolve, 3000 + Math.random() * 2000))

    try {
      const notes = readStored<WelcomeNote[]>(noteStorageKey, [])
      saveStored(noteStorageKey, [
        { id: crypto.randomUUID(), place: answer, date: new Date().toLocaleString() },
        ...notes,
      ])
      localStorage.setItem(welcomeStorageKey, 'true')
      onClose()
    } catch (storageError) {
      console.error('Could not save your welcome response.', storageError)
      setError('We could not save that just now. Please try again.')
      setIsSubmitting(false)
    }
  }

  function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = offerName.trim()
    const email = offerEmail.trim()
    if (!name || !email) {
      setOfferError('Add your name and email to request your offer.')
      return
    }

    const subject = encodeURIComponent('My VC Clothing 20% welcome offer')
    const body = encodeURIComponent(
      `Hello VC Clothing,\n\nI'd love to receive the 20% welcome discount.\n\nName: ${name}\nEmail: ${email}\n\nPlease let me know how to use my offer.\n\nThank you!`,
    )
    window.location.href = `mailto:${ownerEmail}?subject=${subject}&body=${body}`
    setOfferStatus('Your email app should open with your offer request ready. Send the email to let the studio know.')
  }

  return (
    <div className="welcome-backdrop" role="presentation">
      <section className="welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <button className="icon-button welcome-dismiss" onClick={onClose} disabled={isSubmitting} aria-label="Close welcome">
          <X size={19} />
        </button>
        <div className="welcome-brand">
          <img src="/logo.jpeg" alt="VC Clothing logo" />
          <span>VC CLOTHING<small>MADE FOR YOUR MOMENT</small></span>
        </div>
        <span className="eyebrow welcome-eyebrow"><Sparkles size={13} /> A WARM VC WELCOME</span>
        <p className="welcome-kicker">A little closer, already.</p>
        <h2 id="welcome-title">Welcome<br />to <em>VC Clothing.</em></h2>
        <p className="welcome-copy">
          Beautiful clothes feel even better when you know where they come from. Where are you joining us from?
        </p>
        <form onSubmit={submitWelcome} className="welcome-form" aria-busy={isSubmitting}>
          <label className="sr-only" htmlFor="visitor-place">Your city or country</label>
          <input
            id="visitor-place"
            autoFocus
            disabled={isSubmitting}
            value={place}
            onChange={(event) => {
              setPlace(event.target.value)
              setError('')
            }}
            placeholder="Your city, country, anywhere…"
            maxLength={100}
          />
          <button className="button button-dark" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <><LoaderCircle className="spin" size={16} /> Getting your welcome ready…</> : <>Come on in <ArrowRight size={16} /></>}
          </button>
          {isSubmitting && <p className="welcome-loading" role="status">A little moment while we welcome you in…</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
        <span className="welcome-footnote">One small hello, just for our studio.</span>
        <section className="welcome-offer" aria-labelledby="welcome-offer-title">
          <div className="offer-confetti" aria-hidden="true"><span>✳</span><span>✦</span><span>✳</span></div>
          <div className="offer-copy">
            <span className="offer-eyebrow"><Sparkles size={12} /> A LITTLE SOMETHING FROM US</span>
            <h3 id="welcome-offer-title">Your first piece,<br /><em>20% sweeter.</em></h3>
            <p>A warm welcome treat for a piece that feels like you.</p>
          </div>
          {!offerExpanded && !offerStatus && (
            <div className="offer-actions">
              <button className="button button-dark offer-accept" onClick={() => setOfferExpanded(true)}>I’d love 20% off <ArrowRight size={15} /></button>
              <button className="offer-skip" onClick={() => setOfferStatus('Of course. Your welcome offer will be here if you change your mind.')}>No thanks, I’ll skip</button>
            </div>
          )}
          {offerExpanded && !offerStatus && (
            <form className="offer-form" onSubmit={submitOffer}>
              <label>Your name<input autoComplete="name" required maxLength={100} value={offerName} onChange={(event) => { setOfferName(event.target.value); setOfferError('') }} placeholder="Your name" /></label>
              <label>Your email<input type="email" autoComplete="email" required maxLength={254} value={offerEmail} onChange={(event) => { setOfferEmail(event.target.value); setOfferError('') }} placeholder="you@example.com" /></label>
              <button className="button button-dark offer-accept" type="submit">Email my offer request <ArrowRight size={15} /></button>
              {offerError && <p className="form-error" role="alert">{offerError}</p>}
              <button className="offer-skip" type="button" onClick={() => { setOfferExpanded(false); setOfferError('') }}>Maybe later</button>
            </form>
          )}
          {offerStatus && <p className="offer-status" role="status"><Check size={15} /> {offerStatus}</p>}
          <small className="offer-delivery-note">Your email app will open so you can review and send your request to the VC studio.</small>
        </section>
      </section>
    </div>
  )
}

function TypewriterNote({ note }: { note: string }) {
  const [typedNote, setTypedNote] = useState('')

  useEffect(() => {
    let characterIndex = 0
    let typingTimeout = 0
    const delay = window.setTimeout(() => {
      const typing = window.setInterval(() => {
        characterIndex += 1
        setTypedNote(note.slice(0, characterIndex))
        if (characterIndex >= note.length) window.clearInterval(typing)
      }, 65)
      typingTimeout = typing
    }, 3000)

    return () => {
      window.clearTimeout(delay)
      window.clearInterval(typingTimeout)
    }
  }, [note])

  return <p className="hero-typed">{typedNote}<span className="typing-cursor" aria-hidden="true" /></p>
}

function ProductCard({
  product,
  index,
  onAdd,
  onOpen,
  onSizingHelp,
}: {
  product: Product
  index: number
  onAdd: (product: Product) => void
  onOpen: (product: Product) => void
  onSizingHelp: (product: Product) => void
}) {
  const [showAlternate, setShowAlternate] = useState(false)
  const hasAlternate = Boolean(product.imageBack)

  return (
    <article className="product-card" style={{ animationDelay: `${index * 100}ms` }}>
      <div className={`product-image-wrap${showAlternate ? ' show-alternate' : ''}`}>
        <button className="product-image-open" type="button" onClick={() => onOpen(product)} aria-label={`View ${product.name} details`}>
          {product.image
            ? <img className="product-image-front" src={product.image} alt="" loading="lazy" />
            : <span className="product-image-placeholder">A new piece, made for you</span>}
          {product.imageBack && (
            <img className="product-image-back" src={product.imageBack} alt="" loading="lazy" />
          )}
        </button>
        {hasAlternate && (
          <button
            className="alternate-image-toggle"
            type="button"
            aria-label={showAlternate ? `Show front of ${product.name}` : `Show back or alternate view of ${product.name}`}
            onClick={() => setShowAlternate((current) => !current)}
          >
          <span className={showAlternate ? '' : 'view-active'}>FRONT</span><span className="view-separator">·</span><span className={showAlternate ? 'view-active' : ''}>BACK / SIDE</span>
          </button>
        )}
        <span className="product-badge">{index === 0 ? 'A VC favourite' : product.category}</span>
        <button className="heart-button" aria-label={`Save ${product.name}`} onClick={(event) => event.currentTarget.classList.toggle('is-loved')}>
          <Heart size={18} strokeWidth={1.5} />
        </button>
        <button className="quick-add" onClick={() => onAdd(product)} disabled={product.stockQuantity === 0}>
          {product.stockQuantity === 0 ? 'Currently unavailable' : 'Add to your bag'}
          {product.stockQuantity !== 0 && <Plus size={16} />}
        </button>
      </div>
      <div className="product-info">
        <div>
          <button className="product-title-trigger" type="button" onClick={() => onOpen(product)}>{product.name}</button>
          <span>{product.gender} · {product.category}</span>
        </div>
        <strong>{formatPrice(product.price)}</strong>
      </div>
      <p className="product-description">{product.description}</p>
      {product.availableSizes && product.availableSizes.length > 0 && (
        <p className="product-sizes">Available sizes: {product.availableSizes.join(', ')}</p>
      )}
      <button className="sizing-help-link" type="button" onClick={() => onSizingHelp(product)}>
        <Ruler size={13} /> Need help with sizing?
      </button>
    </article>
  )
}

function ProductDetail({ product, onClose, onAdd, onSizingHelp }: {
  product: Product
  onClose: () => void
  onAdd: () => void
  onSizingHelp: () => void
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div className="product-detail-backdrop" onClick={onClose}>
      <main className="product-detail-page" role="dialog" aria-modal="true" aria-labelledby="product-detail-title" onClick={(event) => event.stopPropagation()}>
        <header className="product-detail-header">
          <span className="eyebrow">A LITTLE SOMETHING MADE FOR YOU</span>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close product details"><X size={20} /></button>
        </header>
        <div className="product-detail-content">
          <div className="product-detail-gallery">
            <figure className="product-detail-visual">
              {product.image
                ? <img className="product-detail-photo" src={product.image} alt={product.name} />
                : <span className="product-image-placeholder">A new piece, made for you</span>}
              {product.imageBack && <img className="product-detail-photo product-detail-photo-back" src={product.imageBack} alt={`${product.name}, alternate view`} />}
              <span className="product-detail-orbit" aria-hidden="true" />
            </figure>
            {product.imageBack && <p className="product-detail-hint">A CLOSER LOOK <span>✳</span> FRONT &amp; ALTERNATE VIEW</p>}
          </div>
          <section className="product-detail-copy">
            <span className="eyebrow">{product.gender} · {product.category}</span>
            <h1 id="product-detail-title">{product.name}</h1>
            <strong className="product-detail-price">{formatPrice(product.price)}</strong>
            <p className="product-detail-description">{product.description}</p>
            {product.availableSizes && product.availableSizes.length > 0 && (
              <div className="product-detail-sizes"><span>AVAILABLE SIZES</span><p>{product.availableSizes.join(' · ')}</p></div>
            )}
            <p className="product-detail-stock">{product.stockQuantity === 0 ? 'Currently unavailable' : 'Made with care, ready for your next moment.'}</p>
            <button className="button button-dark product-detail-add" type="button" onClick={onAdd} disabled={product.stockQuantity === 0}>
              {product.stockQuantity === 0 ? 'Currently unavailable' : <>Add to your bag <ShoppingBag size={17} /></>}
            </button>
            <button className="sizing-help-link product-detail-sizing" type="button" onClick={onSizingHelp}>
              <Ruler size={13} /> Need help with sizing?
            </button>
            <p className="product-detail-note">Your order enquiry is sent to the VC studio for availability and delivery confirmation.</p>
          </section>
        </div>
        <button className="product-detail-back" type="button" onClick={onClose}><ArrowLeft size={15} /> Back to the collection</button>
      </main>
    </div>
  )
}

function SizingGuide({ product, onClose }: { product: Product; onClose: () => void }) {
  const message = encodeURIComponent(
    `Hello VC Clothing, I would like sizing help for ${product.name}. Please help me choose the right fit.`,
  )

  return (
    <div className="sizing-backdrop" onClick={onClose}>
      <section
        className="sizing-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sizing-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="icon-button sizing-dismiss" onClick={onClose} aria-label="Close sizing guide">
          <X size={19} />
        </button>
        <span className="eyebrow"><Ruler size={13} /> A LITTLE HELP WITH THE FIT</span>
        <h2 id="sizing-title">Your fit, <em>just right.</em></h2>
        <p className="sizing-product">Looking at: <strong>{product.name}</strong></p>
        <p className="sizing-intro">For the best fit, use a soft tape measure and keep it comfortably close—not tight.</p>
        <ol className="sizing-steps">
          <li><strong>Chest</strong><span>Measure around the fullest part of your chest, keeping the tape level.</span></li>
          <li><strong>Waist</strong><span>Measure around your natural waist, where your body bends.</span></li>
          <li><strong>Hips</strong><span>Measure around the fullest part of your hips while standing naturally.</span></li>
          <li><strong>Length</strong><span>Tell us how you would like the garment to sit, and we’ll help confirm the length.</span></li>
        </ol>
        <p className="sizing-note">Between measurements or prefer a more personal fit? The VC studio can help you choose.</p>
        <a
          className="button button-whatsapp sizing-contact"
          href={`https://wa.me/${ownerWhatsAppInternational}?text=${message}`}
          target="_blank"
          rel="noreferrer"
        >
          Ask the VC studio on WhatsApp <ArrowRight size={16} />
        </a>
      </section>
    </div>
  )
}

function Storefront() {
  const [products, setProducts] = useState<Product[]>(() => (supabase ? [] : readProducts()))
  const [catalogueState, setCatalogueState] = useState<'loading' | 'ready' | 'error' | 'demo'>(
    () => (supabase ? 'loading' : 'demo'),
  )
  const [catalogueError, setCatalogueError] = useState('')
  const [currentYear] = useState(() => new Date().getFullYear())
  const [slideIndex, setSlideIndex] = useState(0)
  const [filter, setFilter] = useState('All pieces')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [orderNotice, setOrderNotice] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [welcomeOpen, setWelcomeOpen] = useState(
    () => !localStorage.getItem(welcomeStorageKey),
  )
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sizingProduct, setSizingProduct] = useState<Product | null>(null)
  const closeProductDetails = useCallback(() => setSelectedProduct(null), [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % heroSlides.length)
    }, 7000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return
    let active = true

    async function refreshCatalogue() {
      try {
        const rows = await fetchPublishedProducts()
        if (!active) return
        setProducts(await Promise.all(rows.map(mapStoreProduct)))
        setCatalogueState('ready')
        setCatalogueError('')
      } catch (error) {
        console.error('Could not load the published product catalogue.', error)
        if (!active) return
        setProducts([])
        setCatalogueState('error')
        setCatalogueError('We could not load the collection. Please try again in a little while.')
      }
    }

    void refreshCatalogue()
    const channel = client
      .channel('public-product-catalogue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        void refreshCatalogue()
      })
      .subscribe()
    const refreshInterval = window.setInterval(() => void refreshCatalogue(), 60_000)

    return () => {
      active = false
      window.clearInterval(refreshInterval)
      void client.removeChannel(channel)
    }
  }, [])

  const categories = useMemo(
    () => ['All categories', ...new Set(products.map((product) => product.category))],
    [products],
  )
  const filteredProducts = products.filter((product) => {
    const matchesGender = filter === 'All pieces' || product.gender === 'Unisex' || product.gender === filter
    const matchesCategory = categoryFilter === 'All categories' || product.category === categoryFilter
    const term = search.trim().toLowerCase()
    return matchesGender && matchesCategory && (!term || `${product.name} ${product.description}`.toLowerCase().includes(term))
  })
  const cartProducts = products.filter((product) => cart[product.id])
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)
  const cartTotal = cartProducts.reduce((sum, product) => sum + product.price * cart[product.id], 0)
  const orderMessage = [
    'Hello VC Clothing, I would like to enquire about this order.',
    '',
    `Name: ${buyerName.trim()}`,
    `Customer WhatsApp: ${buyerPhone.trim()}`,
    ...(buyerEmail.trim() ? [`Customer email: ${buyerEmail.trim()}`] : []),
    '',
    ...cartProducts.flatMap((product) => [
      `${product.name} × ${cart[product.id]}`,
      `Price: ${formatPrice(product.price)} each`,
      `Description: ${product.description}`,
      ...(getProductImageUrl(product)
        ? [`Image: ${getProductImageUrl(product)}`]
        : ['Image: This demo upload is stored in the shop owner’s browser and needs hosted image storage to share.']),
        ...(product.imageBack && getProductImageUrl({ ...product, image: product.imageBack })
          ? [`Back/alternate image: ${getProductImageUrl({ ...product, image: product.imageBack })}`]
          : []),
        '',
    ]),
    `Subtotal: ${formatPrice(cartTotal)}`,
    '',
    'Please contact me to confirm availability, sizing and delivery.',
  ].join('\n')
  const orderMessageEncoded = encodeURIComponent(orderMessage)
  const whatsappOrderUrl = `https://wa.me/${ownerWhatsAppInternational}?text=${orderMessageEncoded}`
  const emailOrderUrl = `mailto:${ownerEmail}?subject=${encodeURIComponent('VC Clothing order enquiry')}&body=${orderMessageEncoded}`

  function addToBag(product: Product) {
    setCart((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }))
    setCartOpen(true)
  }

  function updateQuantity(productId: string, amount: number) {
    setCart((current) => {
      const quantity = (current[productId] ?? 0) + amount
      if (quantity <= 0) {
        const next = { ...current }
        delete next[productId]
        return next
      }
      return { ...current, [productId]: quantity }
    })
  }

  return (
    <div className="storefront">
      <div className="announcement">
        <span>THOUGHTFULLY MADE, ALWAYS PERSONAL</span>
        <span className="announcement-center">Accra, Ghana <span>·</span> Made for wherever you call home</span>
        <a href="#story">OUR STORY <ArrowUpRight size={12} /></a>
      </div>

      <header className="site-header">
        <button className="icon-button mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
          {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <Brand />
        <nav className={`main-nav${mobileMenuOpen ? ' nav-open' : ''}`} aria-label="Main navigation">
          <a href="#collection" onClick={() => setMobileMenuOpen(false)}>Shop all</a>
          <a href="#story" onClick={() => setMobileMenuOpen(false)}>Our story</a>
          <a href="#craft" onClick={() => setMobileMenuOpen(false)}>The craft</a>
        </nav>
        <div className="header-actions">
          <label className="search-box">
            <span className="sr-only">Search the collection</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })
              }}
              placeholder="Find your piece"
            />
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.8" cy="8.8" r="5.6" /><path d="m13 13 4 4" /></svg>
          </label>
          <button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Shopping bag, ${cartCount} items`}>
            <ShoppingBag size={19} strokeWidth={1.5} /><span>Bag</span><b>{cartCount}</b>
          </button>
        </div>
      </header>

      <main>
        <section className="hero" aria-label="VC Clothing introduction">
          <div className="hero-visuals">
            {heroSlides.map((slide, index) => (
              <div className={`hero-slide${index === slideIndex ? ' is-active' : ''}`} key={slide.src} aria-hidden={index !== slideIndex}>
                {slide.type === 'video'
                  ? <video src={slide.src} autoPlay muted loop playsInline aria-label={slide.alt} />
                  : <img src={slide.src} alt={slide.alt} />}
              </div>
            ))}
          </div>
          <div className="hero-shade" />
          <div className="hero-grain" />
          <div className="hero-content">
            <div className="hero-overline"><span className="live-dot" /> AN AFRICAN STORY, TAILORED TO YOU</div>
            <h1>Wear what<br />feels like <em>you.</em></h1>
            <TypewriterNote key={slideIndex} note={heroSlides[slideIndex].note} />
            <a className="button button-cream" href="#collection">Find your feeling <ArrowRight size={16} /></a>
          </div>
          <div className="hero-bottom">
            <a href="#collection" className="scroll-cue"><ArrowDown size={14} /> SCROLL TO FEEL SOMETHING</a>
            <div className="slide-controls" aria-label="Hero slides">
              <span>{String(slideIndex + 1).padStart(2, '0')}</span>
              <div className="slide-progress" aria-hidden="true">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.src}
                    className={index === slideIndex ? 'progress-active' : ''}
                    aria-label={`Show slide ${index + 1}`}
                    onClick={() => setSlideIndex(index)}
                  />
                ))}
              </div>
              <span>{String(heroSlides.length).padStart(2, '0')}</span>
              <button className="hero-next" onClick={() => setSlideIndex((slideIndex + 1) % heroSlides.length)} aria-label="Next slide"><ArrowRight size={16} /></button>
            </div>
          </div>
          <span className="hero-side-note">HANDMADE IN GHANA <span>—</span> WORN EVERYWHERE</span>
        </section>

        <section className="promise-strip" id="craft">
          <span>GOOD CLOTHES, GOOD FEELING.</span>
          <span className="promise-mark">✳</span>
          <span>MADE WITH MEANING.</span>
          <span className="promise-mark">✳</span>
          <span>ALWAYS YOURS.</span>
        </section>

        <section className="collection section-wrap" id="collection">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE THINGS WE MAKE</span>
              <h2>Good things<br className="mobile-break" /> <em>look good on you.</em></h2>
            </div>
            <p>Considered details. Beautiful fabrics.<br />A little more you, in every stitch.</p>
          </div>
          {catalogueState === 'demo' && (
            <p className="catalogue-notice" role="status">
              Preview mode: these existing sample listings are stored in this browser, not in Supabase.
              Add your Supabase settings to load the published store catalogue.
            </p>
          )}
          {catalogueState === 'loading' && (
            <p className="catalogue-notice" role="status">Gathering the latest pieces from the studio…</p>
          )}
          {catalogueState === 'error' && (
            <p className="catalogue-notice catalogue-error" role="alert">{catalogueError}</p>
          )}
            <div className="collection-toolbar">
              <div className="collection-filters">
                <div className="gender-tabs" role="group" aria-label="Filter by gender">
                  {['All pieces', 'Men', 'Women'].map((gender) => (
                    <button key={gender} className={gender === filter ? 'selected' : ''} onClick={() => setFilter(gender)}>
                      {gender}
                    </button>
                  ))}
                </div>
                <label className="category-select-label">
                  <span className="sr-only">Filter by style</span>
                  <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
              </div>
              <span className="result-count">{filteredProducts.length} PIECES TO LOVE</span>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="product-grid">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  onAdd={addToBag}
                  onOpen={setSelectedProduct}
                  onSizingHelp={setSizingProduct}
                />
              ))}
            </div>
          ) : catalogueState === 'ready' || catalogueState === 'demo' ? (
            <div className="empty-results">
              <p>{products.length ? 'No pieces found just yet. Try a different search or category.' : 'The collection is getting ready. Please check back soon.'}</p>
              <button className="text-link" onClick={() => { setSearch(''); setFilter('All pieces'); setCategoryFilter('All categories') }}>See all pieces <ArrowRight size={15} /></button>
            </div>
          ) : null}
          <div className="collection-bottom"><span>MADE SLOWLY. LOVED FOR A LONG TIME.</span><span>{String(filteredProducts.length).padStart(2, '0')} PIECES</span></div>
        </section>

        <section className="story-section" id="story">
          <div className="story-image">
            <img src="/hero%20homepage/WhatsApp%20Image%202026-10-21%20at%205.26.17%20PM.jpeg" alt="Our designer in the studio, beside the fabrics and pieces that inspire each collection" loading="lazy" />
            <span className="story-photo-caption">THE STUDIO, ACCRA <span>·</span> WHERE IT ALL BEGINS</span>
          </div>
          <div className="story-copy">
            <span className="eyebrow"><span className="live-dot" /> OUR LITTLE PHILOSOPHY</span>
            <h2>Clothes that<br />feel like <em>coming home.</em></h2>
            <p>We believe getting dressed can be more than a routine. It can be a reminder of where you come from, how far you've come, and every wonderful thing still ahead.</p>
            <p>From our hands in Accra to wherever life takes you, each VC piece is made with care, character and a little bit of heart.</p>
            <a href="#collection" className="text-link">Get to know the collection <ArrowRight size={16} /></a>
            <span className="story-signature">With love, from VC <span>✳</span></span>
          </div>
        </section>

        <section className="note-section">
          <span className="eyebrow">A NOTE TO YOU</span>
          <blockquote>“You deserve to feel<br /><em>like yourself,</em> beautifully.”</blockquote>
          <span className="note-flower">✳</span>
          <a href="#collection" className="text-link">Wear something that means something <ArrowRight size={16} /></a>
        </section>

        <section className="newsletter-section">
          <div><span className="eyebrow">LET'S STAY CLOSE</span><h2>Good things, now<br />and then.</h2></div>
          <p>New pieces, studio stories and little notes from Accra.<br />Come back whenever you need a little something lovely.</p>
          <a href="#collection" className="button button-dark">Explore the shop <ArrowRight size={16} /></a>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <Brand light />
            <p>Thoughtfully made in Ghana.<br />Made for the moments that matter.</p>
          </div>
          <div className="footer-links"><span>EXPLORE</span><a href="#collection">Shop the collection</a><a href="#story">Our story</a><a href="#craft">How we make it</a></div>
          <div className="footer-links"><span>LET'S TALK</span><a href={`https://wa.me/${ownerWhatsAppInternational}`} target="_blank" rel="noreferrer">WhatsApp the studio</a><a href={`mailto:${ownerEmail}`}>Send us an email</a></div>
          <div className="footer-links"><span>FIND US</span><a href="https://www.tiktok.com/@VC-ClothingGh" target="_blank" rel="noreferrer">TikTok · @VC-ClothingGh <ArrowUpRight size={12} /></a><a href="https://www.facebook.com/search/top?q=illesanmi%20victor%20holad" target="_blank" rel="noreferrer">Facebook · illesanmi victor Holad <ArrowUpRight size={12} /></a></div>
          <div className="footer-note"><span>MADE WITH HEART, IN ACCRA <span>✳</span></span><p>For the moments you want<br />to remember forever.</p></div>
        </div>
        <div className="footer-bottom"><span>© {currentYear} VC CLOTHING. MADE WITH CARE.</span><a href="/admin">STUDIO ACCESS <ArrowUpRight size={12} /></a><span>GHANA <span>·</span> EVERYWHERE</span></div>
      </footer>

      {cartOpen && (
        <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
          <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Your shopping bag" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-heading"><div><span className="eyebrow">THE GOOD THINGS</span><h2>Your bag <span>({cartCount})</span></h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Close bag"><X size={20} /></button></div>
            {cartProducts.length ? (
              <>
                <div className="cart-items">{cartProducts.map((product) => (
                  <article className="cart-item" key={product.id}>
                    <img src={product.image} alt="" />
                    <div className="cart-item-detail"><h3>{product.name}</h3><span>{formatPrice(product.price)}</span>
                      <button className="sizing-help-link cart-sizing-link" type="button" onClick={() => setSizingProduct(product)}>
                        <Ruler size={12} /> Need sizing help?
                      </button>
                      <div className="quantity-control">
                        <button onClick={() => updateQuantity(product.id, -1)} aria-label={`Remove one ${product.name}`}><Minus size={13} /></button>
                        <span>{cart[product.id]}</span>
                        <button onClick={() => updateQuantity(product.id, 1)} aria-label={`Add one ${product.name}`}><Plus size={13} /></button>
                      </div>
                    </div>
                    <button className="remove-item" onClick={() => updateQuantity(product.id, -cart[product.id])} aria-label={`Remove ${product.name}`}><Trash2 size={15} /></button>
                  </article>
                ))}</div>
                <div className="cart-checkout">
                  <div><span>SUBTOTAL</span><strong>{formatPrice(cartTotal)}</strong></div>
                  <p>Share your contact details and we'll prepare a message with your pieces for the VC studio.</p>
                  <form className="order-contact" onChange={() => setOrderNotice('')}>
                    <label>Your name<input required autoComplete="name" value={buyerName} onChange={(event) => setBuyerName(event.target.value)} placeholder="Name" /></label>
                    <label>Your WhatsApp number<input required type="tel" minLength={7} autoComplete="tel" value={buyerPhone} onChange={(event) => setBuyerPhone(event.target.value)} placeholder="e.g. 024 123 4567" /></label>
                    <label>Email <span>(optional)</span><input type="email" autoComplete="email" value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} placeholder="you@example.com" /></label>
                    {orderNotice && <span className="order-notice" role="alert">{orderNotice}</span>}
                    <a className="button button-whatsapp" href={whatsappOrderUrl} target="_blank" rel="noreferrer" onClick={(event) => {
                      const form = event.currentTarget.closest('form')
                      if (!form?.reportValidity()) {
                        event.preventDefault()
                        setOrderNotice('Add your name and WhatsApp number to send your order enquiry.')
                      }
                    }}>Send order on WhatsApp <ArrowRight size={16} /></a>
                    <a className="email-order-link" href={emailOrderUrl} onClick={(event) => {
                      const form = event.currentTarget.closest('form')
                      if (!form?.reportValidity()) {
                        event.preventDefault()
                        setOrderNotice('Add your name and WhatsApp number to send your order enquiry.')
                      }
                    }}>Prefer email? <span>Send your order details</span> <ArrowUpRight size={13} /></a>
                  </form>
                  <small className="order-disclaimer">
                    Your details are included in a draft for you to review and send.
                    {catalogueState === 'demo'
                      ? ' This preview uses the shop’s existing local sample images.'
                      : ' Product photos are included as temporary Supabase image links.'}
                  </small>
                </div>
              </>
            ) : (
              <div className="cart-empty"><ShoppingBag size={30} strokeWidth={1} /><h3>Something lovely belongs here.</h3><p>Your bag is waiting for its first favourite.</p><button className="button button-dark" onClick={() => { setCartOpen(false); document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' }) }}>Explore the collection <ArrowRight size={16} /></button></div>
            )}
          </aside>
        </div>
      )}

      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onClose={closeProductDetails}
          onAdd={() => {
            closeProductDetails()
            addToBag(selectedProduct)
          }}
          onSizingHelp={() => {
            closeProductDetails()
            setSizingProduct(selectedProduct)
          }}
        />
      )}
      {welcomeOpen && <WelcomeOverlay onClose={() => setWelcomeOpen(false)} />}
      {sizingProduct && <SizingGuide product={sizingProduct} onClose={() => setSizingProduct(null)} />}
    </div>
  )
}

function App() {
  return window.location.pathname === '/admin' ? <AdminDashboard /> : <Storefront />
}

export default App
