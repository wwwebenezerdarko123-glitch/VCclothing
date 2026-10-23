import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

let client: SupabaseClient | null = null
let configurationError = ''

if (!supabaseUrl || !supabasePublishableKey) {
  configurationError = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.'
} else {
  try {
    client = createClient(supabaseUrl, supabasePublishableKey)
  } catch (error) {
    console.error('Could not initialize Supabase.', error)
    configurationError = 'Supabase settings are invalid. Check the URL and publishable key in .env.local.'
  }
}

export const supabase = client
export const supabaseConfigurationError = configurationError
