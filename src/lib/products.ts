import { supabase } from './supabase'

export type StoreProduct = {
  id: string
  name: string
  description: string
  price: number
  category: string
  gender: 'Men' | 'Women' | 'Unisex'
  available_sizes: string[]
  stock_quantity: number
  image_urls: string[]
  is_published: boolean
  created_at: string
  updated_at: string
  display_image_urls?: string[]
}

export type ProductInput = {
  name: string
  description: string
  price: number
  category: string
  gender: 'Men' | 'Women' | 'Unisex'
  available_sizes: string[]
  stock_quantity: number
  image_urls: string[]
  is_published: boolean
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured. Add the environment variables before using the studio.')
  return supabase
}

export async function createProductImageUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  const client = requireSupabase()
  if (import.meta.env.VITE_SUPABASE_IMAGES_PUBLIC === 'true') {
    return client.storage.from('images').getPublicUrl(path).data.publicUrl
  }
  const { data, error } = await client.storage.from('images').createSignedUrl(path, 60 * 60)
  if (error) throw error
  return data.signedUrl
}

function normalizeProduct(row: Record<string, unknown>): StoreProduct {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    price: Number(row.price),
    category: String(row.category ?? ''),
    gender: row.gender === 'Men' || row.gender === 'Women' || row.gender === 'Unisex' ? row.gender : 'Unisex',
    available_sizes: Array.isArray(row.available_sizes) ? row.available_sizes.map(String) : [],
    stock_quantity: Number(row.stock_quantity ?? 0),
    image_urls: Array.isArray(row.image_urls) ? row.image_urls.map(String) : [],
    is_published: Boolean(row.is_published),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

export async function fetchPublishedProducts() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Record<string, unknown>[]).map(normalizeProduct)
}

export async function fetchAdminProducts() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return Promise.all((data as Record<string, unknown>[]).map(async (row) => {
    const product = normalizeProduct(row)
    const display_image_urls = await Promise.all(product.image_urls.map(createProductImageUrl))
    return { ...product, display_image_urls }
  }))
}

export async function saveProduct(product: ProductInput, id?: string) {
  const client = requireSupabase()
  const updatedProduct = { ...product, updated_at: new Date().toISOString() }
  const query = id
    ? client.from('products').update(updatedProduct).eq('id', id)
    : client.from('products').insert(updatedProduct)
  const { error } = await query
  if (error) throw error
}

export async function deleteProduct(id: string) {
  const { error } = await requireSupabase().from('products').delete().eq('id', id)
  if (error) throw error
}

export async function uploadProductImage(file: File, userId: string) {
  const client = requireSupabase()
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!supportedTypes.includes(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP image.')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Each photo must be 10 MB or smaller.')
  }

  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await client.storage.from('images').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function removeProductImages(paths: string[]) {
  const storedPaths = paths.filter((path) => !/^https?:\/\//i.test(path))
  if (!storedPaths.length) return
  const { error } = await requireSupabase().storage.from('images').remove(storedPaths)
  if (error) throw error
}
