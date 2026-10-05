-- MINAR SEA FOOD — row level security
-- This file is the real access control. The UI only hides things; Postgres is
-- what actually refuses. Roles: super_admin > manager > waiter.

alter table public.profiles enable row level security;
alter table public.dining_tables enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- Everyone can always read their own row, so a deactivated login still gets a
-- clear "your account is switched off" screen instead of a blank page.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

-- Column-level rules (role, is_active) live in guard_profile_changes().
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_manager())
  with check (id = auth.uid() or public.is_manager());

-- No insert or delete policy on purpose: profiles are created by the
-- auth.users trigger, and staff are deactivated rather than deleted so their
-- sales history stays attributable.

-- ---------------------------------------------------------------------------
-- dining_tables — every staff member reads the floor, managers change it
-- ---------------------------------------------------------------------------

drop policy if exists tables_select on public.dining_tables;
create policy tables_select on public.dining_tables
  for select to authenticated using (public.is_staff());

drop policy if exists tables_write on public.dining_tables;
create policy tables_write on public.dining_tables
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- ---------------------------------------------------------------------------
-- menu — the public site reads it anonymously
-- ---------------------------------------------------------------------------

drop policy if exists categories_public_read on public.menu_categories;
create policy categories_public_read on public.menu_categories
  for select to anon using (is_active);

drop policy if exists categories_staff_read on public.menu_categories;
create policy categories_staff_read on public.menu_categories
  for select to authenticated using (public.is_staff());

drop policy if exists categories_write on public.menu_categories;
create policy categories_write on public.menu_categories
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- Visitors see items in published categories, including sold-out ones, which
-- the site renders as "sold out today".
drop policy if exists menu_items_public_read on public.menu_items;
create policy menu_items_public_read on public.menu_items
  for select to anon
  using (
    exists (
      select 1 from public.menu_categories c
      where c.id = menu_items.category_id and c.is_active
    )
  );

drop policy if exists menu_items_staff_read on public.menu_items;
create policy menu_items_staff_read on public.menu_items
  for select to authenticated using (public.is_staff());

drop policy if exists menu_items_write on public.menu_items;
create policy menu_items_write on public.menu_items
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- ---------------------------------------------------------------------------
-- audit_log — super admin only. Writes come from audit_write(), which is
-- SECURITY DEFINER and owned by postgres, so it is not affected by this.
-- ---------------------------------------------------------------------------

drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log
  for select to authenticated using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Storage for dish photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('menu', 'menu', true)
on conflict (id) do nothing;

drop policy if exists "menu images public read" on storage.objects;
create policy "menu images public read" on storage.objects
  for select using (bucket_id = 'menu');

drop policy if exists "menu images manager write" on storage.objects;
create policy "menu images manager write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'menu' and public.is_manager());

drop policy if exists "menu images manager update" on storage.objects;
create policy "menu images manager update" on storage.objects
  for update to authenticated
  using (bucket_id = 'menu' and public.is_manager())
  with check (bucket_id = 'menu' and public.is_manager());

drop policy if exists "menu images manager delete" on storage.objects;
create policy "menu images manager delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'menu' and public.is_manager());
