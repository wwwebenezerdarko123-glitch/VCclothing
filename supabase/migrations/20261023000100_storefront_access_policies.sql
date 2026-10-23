-- Review and run this migration in the Supabase SQL Editor.
-- It reuses public.products and public.admin_users, and installs public.is_store_admin().
-- It does not create tables, change product data, or change the images bucket visibility.

alter table public.products enable row level security;
alter table public.admin_users enable row level security;

-- Existing products remain visible in all catalogue filters until categorized.
alter table public.products
  add column if not exists gender text not null default 'Unisex';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'products_gender_check'
  ) then
    alter table public.products
      add constraint products_gender_check
      check (gender in ('Men', 'Women', 'Unisex'));
  end if;
end
$$;

-- Keep the allowlist private while allowing RLS policies to check the caller.
create or replace function public.is_store_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_store_admin() from public;
grant execute on function public.is_store_admin() to anon, authenticated;

revoke all on table public.admin_users from public, anon, authenticated;
revoke all on table public.products from public, anon, authenticated;
grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;

drop policy if exists vc_products_public_read_published on public.products;
drop policy if exists vc_products_admin_manage on public.products;
drop policy if exists vc_products_read_limit on public.products;
drop policy if exists vc_products_insert_limit on public.products;
drop policy if exists vc_products_update_limit on public.products;
drop policy if exists vc_products_delete_limit on public.products;

create policy vc_products_public_read_published
  on public.products for select
  to anon, authenticated
  using (is_published is true);

create policy vc_products_admin_manage
  on public.products for all
  to authenticated
  using (public.is_store_admin())
  with check (public.is_store_admin());

-- Restrictive policies also cap any pre-existing permissive policies.
create policy vc_products_read_limit
  on public.products as restrictive for select
  to anon, authenticated
  using (is_published is true or public.is_store_admin());

create policy vc_products_insert_limit
  on public.products as restrictive for insert
  to authenticated
  with check (public.is_store_admin());

create policy vc_products_update_limit
  on public.products as restrictive for update
  to authenticated
  using (public.is_store_admin())
  with check (public.is_store_admin());

create policy vc_products_delete_limit
  on public.products as restrictive for delete
  to authenticated
  using (public.is_store_admin());

-- The client never reads admin_users directly; authorization checks use the protected function.

drop policy if exists vc_images_public_read on storage.objects;
drop policy if exists vc_images_admin_upload on storage.objects;
drop policy if exists vc_images_admin_update on storage.objects;
drop policy if exists vc_images_admin_delete on storage.objects;
drop policy if exists vc_images_read_limit on storage.objects;
drop policy if exists vc_images_insert_limit on storage.objects;
drop policy if exists vc_images_update_limit on storage.objects;
drop policy if exists vc_images_delete_limit on storage.objects;

create policy vc_images_public_read
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'images'
    and (
      public.is_store_admin()
      or exists (
        select 1
        from public.products
        where public.products.is_published is true
          and storage.objects.name = any(public.products.image_urls)
      )
    )
  );

create policy vc_images_admin_upload
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'images' and public.is_store_admin());

create policy vc_images_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'images' and public.is_store_admin())
  with check (bucket_id = 'images' and public.is_store_admin());

create policy vc_images_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'images' and public.is_store_admin());

-- Keep any existing broad Storage policies from allowing public writes to images
-- without changing access to objects in other buckets.
create policy vc_images_insert_limit
  on storage.objects as restrictive for insert
  to public
  with check (bucket_id <> 'images' or public.is_store_admin());

create policy vc_images_update_limit
  on storage.objects as restrictive for update
  to public
  using (bucket_id <> 'images' or public.is_store_admin())
  with check (bucket_id <> 'images' or public.is_store_admin());

create policy vc_images_delete_limit
  on storage.objects as restrictive for delete
  to public
  using (bucket_id <> 'images' or public.is_store_admin());

create policy vc_images_read_limit
  on storage.objects as restrictive for select
  to public
  using (
    bucket_id <> 'images'
    or public.is_store_admin()
    or exists (
      select 1
      from public.products
      where public.products.is_published is true
        and storage.objects.name = any(public.products.image_urls)
    )
  );

-- Enable product-change notifications where Realtime is available.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication where pubname = 'supabase_realtime' and puballtables
     )
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'products'
     ) then
    alter publication supabase_realtime add table public.products;
  end if;
end
$$;
