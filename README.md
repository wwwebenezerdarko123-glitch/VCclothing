# VC Clothing

The existing responsive VC Clothing storefront, built with React, TypeScript, and Vite. The original visual design, hero, animations, sizing guide, search/filter controls, cart, WhatsApp order enquiry, welcome overlay, and social links remain in place.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Add the Supabase project URL and **publishable** key to `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

These Vite variables are included in the browser bundle. Only the project URL and publishable key belong here; never use a secret or service-role key in this frontend. `.env.local` is ignored by Git.

For a public `images` bucket, the app can use public URLs instead by setting `VITE_SUPABASE_IMAGES_PUBLIC=true`. This optional setting is public configuration, not a secret.

Without these variables, the storefront runs in a clearly labeled local preview using the existing sample products. The `/admin` page will explain that Supabase setup is required. When configured, public visitors see only rows with `is_published = true`; database errors do not fall back to sample listings.

## Vercel deployment

The repository includes a Vercel rewrite that serves the Vite app for direct routes such as `/admin`. Deploy or redeploy the project after this configuration is added; Vercel must build the latest commit for the route to work.

## Supabase setup

1. Review and run [`supabase/migrations/20261023000100_storefront_access_policies.sql`](./supabase/migrations/20261023000100_storefront_access_policies.sql) in the Supabase SQL Editor. It reuses the existing `products`, `admin_users`, and `is_store_admin()` objects, adds a `gender` column (existing products default to `Unisex`), and applies product and image Storage access policies. It does not recreate tables or alter other product data.
2. The migration installs `is_store_admin()` as a `SECURITY DEFINER` function with an empty fixed `search_path`. It checks only whether the signed-in user's `auth.uid()` exists in `public.admin_users.user_id`; it does not expose allowlist rows to the browser.
3. Create the administrator account in Supabase Authentication. Then, after confirming the new account's Auth user ID, add only that ID to the existing `admin_users` allowlist using the schema's actual constraints. The website has no public registration flow and never grants admin access automatically.
4. Confirm the Storage bucket is named exactly `images`. The safer default is a **private** bucket: the migration allows visitors to request signed image URLs only for photos belonging to published products. If the bucket is already public, set `VITE_SUPABASE_IMAGES_PUBLIC=true` to use public URLs; public buckets make every object in that bucket readable to anyone, including unpublished photos. In either case, do not make uploads, updates, or deletes public.
5. In production hosting settings, add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` values. Redeploy after changing them.

The SQL migration adds the `gender` column, installs the allowlist-check function, applies product and Storage RLS policies, restrictive guard policies that cap older permissive policies, removes direct client access to `admin_users`, and adds product changes to Realtime when that publication exists. Review the migration and current project policies before running it. Do not disable RLS.

## Manage products

Visit `/admin` and sign in with the administrator's Supabase Auth email and password. The application verifies access through `is_store_admin()` before showing the dashboard. The session is managed by Supabase Auth; the website does not save the password.

The dashboard supports creating and editing products, deleting with confirmation, publishing/unpublishing, stock and size updates, multiple photo previews, primary-image selection, and Storage uploads to `images`. Photo uploads are limited to JPG, PNG, or WebP and 10 MB each. Product records store Storage paths in `image_urls`, not base64 image data. Private-bucket image links are signed and expire after one hour. Public product changes refresh through Realtime and a periodic refresh.

The catalog uses the database fields `name`, `description`, `price`, `category`, `gender`, `available_sizes`, `stock_quantity`, `image_urls`, `is_published`, and timestamps. The gender field supports `Men`, `Women`, and `Unisex`; existing products default to `Unisex`.

The welcome-screen visitor hellos remain in the visitor's local browser and are not collected in Supabase. WhatsApp/email order enquiries remain customer-composed messages; this website does not process payments.

## Checks

```bash
npm run lint
npm run build
```
