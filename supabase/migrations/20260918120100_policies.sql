-- MINAR SEA FOOD — row level security
-- This file is the real access control. The UI only hides things; Postgres is
-- what actually refuses. Roles: super_admin > manager > waiter.

alter table public.profiles enable row level security;
alter table public.dining_tables enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.audit_log enable row level security;

grant delete on public.orders to authenticated;

-- ---------------------------------------------------------------------------
-- Extra guards that RLS cannot express, because RLS works on rows and these
-- rules are about specific columns.
-- ---------------------------------------------------------------------------

create or replace function public.guard_waiter_order_limits()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.current_app_role() <> 'waiter' then
    return new;
  end if;

  if new.discount is distinct from old.discount then
    raise exception 'Discounts need a manager';
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    raise exception 'Cancelling an order needs a manager';
  end if;

  if new.waiter_id is distinct from old.waiter_id then
    raise exception 'You cannot hand an order to another waiter; ask a manager';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_orders_waiter_limits on public.orders;
create trigger trg_orders_waiter_limits before update on public.orders
  for each row execute function public.guard_waiter_order_limits();

create or replace function public.guard_void_authority()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.voided_at is not null and old.voided_at is null then
    if not (public.is_manager() or public.is_privileged_connection()) then
      raise exception 'Voiding a punched item needs a manager';
    end if;
    new.voided_by := coalesce(new.voided_by, auth.uid());
    new.voided_at := coalesce(new.voided_at, now());
  end if;

  if new.voided_at is null and old.voided_at is not null
     and not public.can_override() then
    raise exception 'Only a super admin can un-void an item';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_order_items_void_authority on public.order_items;
create trigger trg_order_items_void_authority before update on public.order_items
  for each row execute function public.guard_void_authority();

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
-- orders — a waiter's world is their own tables and nothing else
-- ---------------------------------------------------------------------------

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select to authenticated
  using (public.is_manager() or waiter_id = auth.uid());

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
  for insert to authenticated
  with check (
    public.is_manager()
    or (
      public.current_app_role() = 'waiter'
      and waiter_id = auth.uid()
      and status = 'open'
      and discount = 0
    )
  );

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders
  for update to authenticated
  using (
    public.is_manager()
    or (waiter_id = auth.uid() and status in ('open', 'billed'))
  )
  with check (
    public.is_manager()
    or (waiter_id = auth.uid() and status in ('open', 'billed', 'paid'))
  );

-- Only a super admin can actually erase an order; everyone else cancels it so
-- the row stays in the audit trail.
drop policy if exists orders_delete on public.orders;
create policy orders_delete on public.orders
  for delete to authenticated using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------

create or replace function public.owns_order(p_order uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order and o.waiter_id = auth.uid()
  )
$$;

create or replace function public.order_is_open(p_order uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order and o.status = 'open'
  )
$$;

grant execute on function public.owns_order(uuid) to authenticated;
grant execute on function public.order_is_open(uuid) to authenticated;

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select to authenticated
  using (public.is_manager() or public.owns_order(order_id));

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items
  for insert to authenticated
  with check (
    public.order_is_open(order_id)
    and (public.is_manager() or public.owns_order(order_id))
  );

-- Quantity edits and manager voids. guard_void_authority() decides who may void.
drop policy if exists order_items_update on public.order_items;
create policy order_items_update on public.order_items
  for update to authenticated
  using (public.is_manager() or public.owns_order(order_id))
  with check (public.is_manager() or public.owns_order(order_id));

-- A waiter gets a two minute window to undo their own mis-tap. After that the
-- line has to be voided by a manager, which leaves a record.
drop policy if exists order_items_delete on public.order_items;
create policy order_items_delete on public.order_items
  for delete to authenticated
  using (
    public.is_manager()
    or (
      added_by = auth.uid()
      and created_at > now() - interval '2 minutes'
      and public.order_is_open(order_id)
      and public.owns_order(order_id)
    )
  );

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
