-- MINAR SEA FOOD — core schema
-- Tables, integrity triggers, audit triggers and reporting views.
-- Row level security lives in the next migration.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.app_role as enum ('super_admin', 'manager', 'waiter');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('open', 'billed', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'card', 'upi');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Business date: the sales day runs 5am to 5am, so a 1:30am order still
-- belongs to the previous night's takings. Mirrored in src/shared/lib/dates.ts.
-- ---------------------------------------------------------------------------

create or replace function public.business_date_for(ts timestamptz)
returns date
language sql
stable
set search_path = public, pg_temp
as $$
  select ((ts at time zone 'Asia/Kolkata') - interval '5 hours')::date;
$$;

comment on function public.business_date_for(timestamptz) is
  'Maps an instant to the restaurant sales day (5am rollover, Asia/Kolkata).';

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  role public.app_role not null default 'waiter',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per staff login. `role` drives every RLS policy in this database.';

create index if not exists profiles_role_idx on public.profiles (role) where is_active;

-- Role helpers. SECURITY DEFINER so a policy on `profiles` can read `profiles`
-- without recursing through its own RLS. An inactive account resolves to NULL,
-- which fails every policy and locks the login out immediately.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and p.is_active
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_app_role() = 'super_admin', false)
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_app_role() in ('super_admin', 'manager'), false)
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_app_role() is not null
$$;

-- True for the SQL editor, the service key and migrations. Without this the
-- integrity guards below would lock the owner out of repairing their own data.
create or replace function public.is_privileged_connection()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select current_user in (
    'postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role'
  )
$$;

/** Super admin, or a direct/service connection doing maintenance. */
create or replace function public.can_override()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.is_super_admin() or public.is_privileged_connection()
$$;

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text,
  actor_role text,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);

create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id, at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id);

create or replace function public.audit_write(
  p_action text,
  p_entity text,
  p_entity_id text,
  p_before jsonb default null,
  p_after jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_role text;
begin
  select p.full_name, p.role::text into v_name, v_role
  from public.profiles p where p.id = auth.uid();

  insert into public.audit_log (
    actor_id, actor_name, actor_role, action, entity, entity_id, before, after
  ) values (
    auth.uid(), v_name, v_role, p_action, p_entity, p_entity_id, p_before, p_after
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Floor and menu
-- ---------------------------------------------------------------------------

create table if not exists public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  label text not null unique check (length(trim(label)) > 0),
  seats integer not null default 4 check (seats between 1 and 40),
  zone text not null default 'Main Hall',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name)
);

create index if not exists menu_items_category_idx
  on public.menu_items (category_id, sort_order, name);
create index if not exists menu_items_available_idx
  on public.menu_items (is_available) where is_available;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no integer not null,
  business_date date not null default public.business_date_for(now()),
  table_id uuid references public.dining_tables (id) on delete set null,
  waiter_id uuid references public.profiles (id) on delete set null,
  status public.order_status not null default 'open',
  guest_count integer not null default 1 check (guest_count between 0 and 99),
  subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  discount numeric(10, 2) not null default 0 check (discount >= 0),
  discount_reason text,
  total numeric(10, 2) not null default 0 check (total >= 0),
  payment_method public.payment_method,
  notes text,
  opened_at timestamptz not null default now(),
  billed_at timestamptz,
  closed_at timestamptz,
  closed_by uuid references public.profiles (id) on delete set null,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_date, order_no)
);

comment on column public.orders.order_no is
  'Bill number, restarts at 1 every business date.';

-- A table can only have one live order at a time; this is what makes the floor
-- grid trustworthy when several waiters are punching at once.
create unique index if not exists orders_one_live_per_table
  on public.orders (table_id)
  where status in ('open', 'billed') and table_id is not null;

create index if not exists orders_business_date_idx
  on public.orders (business_date desc, order_no desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_waiter_idx
  on public.orders (waiter_id, business_date desc);
create index if not exists orders_table_idx on public.orders (table_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  -- Defaults exist only so the app can insert {order_id, menu_item_id} and let
  -- snapshot_order_item() fill in the real name and price from the menu.
  name_snapshot text not null default '—' check (length(trim(name_snapshot)) > 0),
  unit_price_snapshot numeric(10, 2) not null default 0 check (unit_price_snapshot >= 0),
  qty integer not null default 1 check (qty between 1 and 999),
  line_total numeric(10, 2) generated always as (
    case when voided_at is null then round(qty * unit_price_snapshot, 2) else 0 end
  ) stored,
  notes text,
  added_by uuid references public.profiles (id) on delete set null,
  voided_at timestamptz,
  voided_by uuid references public.profiles (id) on delete set null,
  void_reason text,
  created_at timestamptz not null default now()
);

comment on column public.order_items.name_snapshot is
  'Copied from menu_items at punch time so past bills survive menu edits.';
comment on column public.order_items.added_by is
  'Attribution per line, so a shared table still credits the right waiter.';

create index if not exists order_items_order_idx
  on public.order_items (order_id, created_at);
create index if not exists order_items_menu_item_idx
  on public.order_items (menu_item_id);
create index if not exists order_items_added_by_idx
  on public.order_items (added_by);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_menu_items_touch on public.menu_items;
create trigger trg_menu_items_touch before update on public.menu_items
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Bill numbering
-- ---------------------------------------------------------------------------

create or replace function public.assign_order_no()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.business_date := coalesce(new.business_date, public.business_date_for(now()));

  -- Serialises numbering per sales day without locking the whole table.
  perform pg_advisory_xact_lock(hashtext('minar.order_no:' || new.business_date::text));

  select coalesce(max(o.order_no), 0) + 1
  into new.order_no
  from public.orders o
  where o.business_date = new.business_date;

  return new;
end;
$$;

drop trigger if exists trg_orders_assign_no on public.orders;
create trigger trg_orders_assign_no before insert on public.orders
  for each row execute function public.assign_order_no();

-- ---------------------------------------------------------------------------
-- Money. Totals are always derived in the database; nothing the browser sends
-- for subtotal, total or unit price is trusted.
-- ---------------------------------------------------------------------------

create or replace function public.snapshot_order_item()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_status public.order_status;
  v_name text;
  v_price numeric(10, 2);
  v_available boolean;
begin
  select o.status into v_status from public.orders o where o.id = new.order_id;
  if v_status is null then
    raise exception 'Order not found, or you do not have access to it';
  end if;
  if v_status <> 'open' then
    raise exception 'This order is already %; reopen it before changing items', v_status;
  end if;

  if new.menu_item_id is not null then
    select m.name, m.price, m.is_available
    into v_name, v_price, v_available
    from public.menu_items m
    where m.id = new.menu_item_id;

    if v_name is null then
      raise exception 'Menu item no longer exists';
    end if;
    if not v_available and tg_op = 'INSERT' then
      raise exception '% is marked unavailable right now', v_name;
    end if;

    new.name_snapshot := v_name;
    new.unit_price_snapshot := v_price;
  end if;

  new.added_by := coalesce(new.added_by, auth.uid());
  return new;
end;
$$;

drop trigger if exists trg_order_items_snapshot on public.order_items;
create trigger trg_order_items_snapshot before insert on public.order_items
  for each row execute function public.snapshot_order_item();

-- Keeps the stored total consistent with subtotal and discount on every write,
-- whichever path changed them.
create or replace function public.apply_order_money()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.discount := greatest(coalesce(new.discount, 0), 0);
  new.total := round(greatest(new.subtotal - least(new.discount, new.subtotal), 0), 2);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_orders_money on public.orders;
create trigger trg_orders_money before insert or update on public.orders
  for each row execute function public.apply_order_money();

create or replace function public.recalc_order_subtotal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_orders uuid[];
  v_order uuid;
  v_subtotal numeric(10, 2);
begin
  -- Merging tables moves lines between orders, so both ends need recalculating.
  if tg_op = 'DELETE' then
    v_orders := array[old.order_id];
  elsif tg_op = 'UPDATE' and new.order_id is distinct from old.order_id then
    v_orders := array[new.order_id, old.order_id];
  else
    v_orders := array[new.order_id];
  end if;

  foreach v_order in array v_orders loop
    select coalesce(sum(oi.line_total), 0)
    into v_subtotal
    from public.order_items oi
    where oi.order_id = v_order;

    update public.orders set subtotal = v_subtotal where id = v_order;
  end loop;

  return null;
end;
$$;

drop trigger if exists trg_order_items_recalc on public.order_items;
create trigger trg_order_items_recalc
  after insert or update or delete on public.order_items
  for each row execute function public.recalc_order_subtotal();

-- ---------------------------------------------------------------------------
-- Order lifecycle rules
-- ---------------------------------------------------------------------------

create or replace function public.guard_order_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status in ('paid', 'cancelled')
     and new.status <> old.status
     and not public.can_override() then
    raise exception 'Only a super admin can reopen a % bill', old.status;
  end if;

  if old.status in ('paid', 'cancelled') and new.status = old.status then
    -- Settled history is immutable apart from a super admin reopening it.
    if not public.can_override()
       and (new.subtotal, new.discount, new.total, new.waiter_id, new.table_id)
           is distinct from (old.subtotal, old.discount, old.total, old.waiter_id, old.table_id) then
      raise exception 'A settled bill cannot be edited';
    end if;
  end if;

  if new.status = 'billed' and old.status = 'open' then
    new.billed_at := coalesce(new.billed_at, now());
  end if;

  if new.status = 'paid' and old.status <> 'paid' then
    if new.payment_method is null then
      raise exception 'Choose a payment method before settling the bill';
    end if;
    new.billed_at := coalesce(new.billed_at, now());
    new.closed_at := coalesce(new.closed_at, now());
    new.closed_by := coalesce(new.closed_by, auth.uid());
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.closed_at := coalesce(new.closed_at, now());
    new.closed_by := coalesce(new.closed_by, auth.uid());
    new.payment_method := null;
  end if;

  if new.status = 'open' and old.status <> 'open' then
    new.billed_at := null;
    new.closed_at := null;
    new.closed_by := null;
    new.payment_method := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_orders_guard_status on public.orders;
create trigger trg_orders_guard_status before update on public.orders
  for each row execute function public.guard_order_status();

-- Nothing may be punched onto, or removed from, a closed bill.
create or replace function public.guard_closed_order_items()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status public.order_status;
  v_order uuid;
begin
  if tg_op = 'DELETE' then
    v_order := old.order_id;
  else
    v_order := new.order_id;
  end if;

  select o.status into v_status from public.orders o where o.id = v_order;

  if v_status in ('paid', 'cancelled') and not public.can_override() then
    raise exception 'This bill is already %; it cannot be changed', v_status;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_items_guard on public.order_items;
create trigger trg_order_items_guard
  before update or delete on public.order_items
  for each row execute function public.guard_closed_order_items();

-- ---------------------------------------------------------------------------
-- Audit triggers — the answer to "who did this?" without trusting the app layer
-- ---------------------------------------------------------------------------

create or replace function public.audit_orders()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    perform public.audit_write(
      'order.opened', 'orders', new.id::text, null,
      jsonb_build_object(
        'order_no', new.order_no, 'table_id', new.table_id,
        'waiter_id', new.waiter_id, 'guest_count', new.guest_count
      )
    );
    return null;
  end if;

  if new.status is distinct from old.status then
    perform public.audit_write(
      'order.' || new.status, 'orders', new.id::text,
      jsonb_build_object('status', old.status),
      jsonb_build_object(
        'status', new.status, 'total', new.total,
        'payment_method', new.payment_method, 'cancel_reason', new.cancel_reason
      )
    );
  end if;

  if new.discount is distinct from old.discount then
    perform public.audit_write(
      'order.discount', 'orders', new.id::text,
      jsonb_build_object('discount', old.discount),
      jsonb_build_object('discount', new.discount, 'reason', new.discount_reason)
    );
  end if;

  if new.table_id is distinct from old.table_id then
    perform public.audit_write(
      'order.moved', 'orders', new.id::text,
      jsonb_build_object('table_id', old.table_id),
      jsonb_build_object('table_id', new.table_id)
    );
  end if;

  if new.waiter_id is distinct from old.waiter_id then
    perform public.audit_write(
      'order.reassigned', 'orders', new.id::text,
      jsonb_build_object('waiter_id', old.waiter_id),
      jsonb_build_object('waiter_id', new.waiter_id)
    );
  end if;

  return null;
end;
$$;

drop trigger if exists trg_orders_audit on public.orders;
create trigger trg_orders_audit after insert or update on public.orders
  for each row execute function public.audit_orders();

create or replace function public.audit_order_items()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    perform public.audit_write(
      'item.added', 'order_items', new.id::text, null,
      jsonb_build_object(
        'order_id', new.order_id, 'item', new.name_snapshot,
        'qty', new.qty, 'unit_price', new.unit_price_snapshot
      )
    );
  elsif tg_op = 'DELETE' then
    perform public.audit_write(
      'item.removed', 'order_items', old.id::text,
      jsonb_build_object(
        'order_id', old.order_id, 'item', old.name_snapshot, 'qty', old.qty
      ),
      null
    );
  else
    if new.voided_at is not null and old.voided_at is null then
      perform public.audit_write(
        'item.voided', 'order_items', new.id::text,
        jsonb_build_object('item', old.name_snapshot, 'qty', old.qty),
        jsonb_build_object('reason', new.void_reason, 'order_id', new.order_id)
      );
    elsif new.qty is distinct from old.qty then
      perform public.audit_write(
        'item.qty', 'order_items', new.id::text,
        jsonb_build_object('item', old.name_snapshot, 'qty', old.qty),
        jsonb_build_object('qty', new.qty, 'order_id', new.order_id)
      );
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_order_items_audit on public.order_items;
create trigger trg_order_items_audit
  after insert or update or delete on public.order_items
  for each row execute function public.audit_order_items();

create or replace function public.audit_menu_items()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    perform public.audit_write('menu.created', 'menu_items', new.id::text, null,
      jsonb_build_object('name', new.name, 'price', new.price));
  elsif tg_op = 'DELETE' then
    perform public.audit_write('menu.deleted', 'menu_items', old.id::text,
      jsonb_build_object('name', old.name, 'price', old.price), null);
  elsif new.price is distinct from old.price then
    perform public.audit_write('menu.price', 'menu_items', new.id::text,
      jsonb_build_object('name', old.name, 'price', old.price),
      jsonb_build_object('name', new.name, 'price', new.price));
  elsif new.is_available is distinct from old.is_available then
    perform public.audit_write('menu.availability', 'menu_items', new.id::text,
      jsonb_build_object('is_available', old.is_available),
      jsonb_build_object('name', new.name, 'is_available', new.is_available));
  end if;
  return null;
end;
$$;

drop trigger if exists trg_menu_items_audit on public.menu_items;
create trigger trg_menu_items_audit
  after insert or update or delete on public.menu_items
  for each row execute function public.audit_menu_items();

-- Role and activation are privileged fields, so they get their own gate rather
-- than relying on the app remembering to check.
create or replace function public.guard_profile_changes()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_remaining_admins int;
begin
  if old.role = 'super_admin' and not public.can_override() then
    raise exception 'Only a super admin can edit a super admin account';
  end if;

  if new.role is distinct from old.role and not public.can_override() then
    raise exception 'Only a super admin can change a role';
  end if;

  if new.is_active is distinct from old.is_active and not (public.is_manager() or public.is_privileged_connection()) then
    raise exception 'Only a manager or super admin can activate or deactivate staff';
  end if;

  -- Never let the restaurant lock itself out of its own reports.
  if old.role = 'super_admin'
     and (new.role <> 'super_admin' or not new.is_active) then
    select count(*) into v_remaining_admins
    from public.profiles p
    where p.role = 'super_admin' and p.is_active and p.id <> old.id;

    if v_remaining_admins = 0 then
      raise exception 'This is the last active super admin; promote someone else first';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_changes();

create or replace function public.audit_profiles()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    perform public.audit_write('staff.created', 'profiles', new.id::text, null,
      jsonb_build_object('full_name', new.full_name, 'role', new.role));
  else
    if new.role is distinct from old.role then
      perform public.audit_write('staff.role', 'profiles', new.id::text,
        jsonb_build_object('role', old.role),
        jsonb_build_object('full_name', new.full_name, 'role', new.role));
    end if;
    if new.is_active is distinct from old.is_active then
      perform public.audit_write(
        case when new.is_active then 'staff.reactivated' else 'staff.deactivated' end,
        'profiles', new.id::text,
        jsonb_build_object('is_active', old.is_active),
        jsonb_build_object('full_name', new.full_name, 'is_active', new.is_active));
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_profiles_audit on public.profiles;
create trigger trg_profiles_audit after insert or update on public.profiles
  for each row execute function public.audit_profiles();

-- ---------------------------------------------------------------------------
-- New logins get a profile automatically.
-- The role is always 'waiter' here — metadata comes from the client and cannot
-- be trusted. /admin/staff promotes the account afterwards with the service key.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, role, phone)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, 'staff'), '@', 1)
    ),
    'waiter',
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Reporting views.
-- security_invoker = true is essential: without it these views would run as the
-- owner and hand every waiter the whole restaurant's numbers.
-- ---------------------------------------------------------------------------

create or replace view public.v_sales_daily
with (security_invoker = true) as
with days as (
  select distinct o.business_date from public.orders o
),
paid as (
  select
    o.business_date,
    count(*)::int as orders_count,
    coalesce(sum(o.guest_count), 0)::int as covers,
    coalesce(sum(o.subtotal), 0)::numeric(12, 2) as gross_sales,
    coalesce(sum(o.discount), 0)::numeric(12, 2) as discount_total,
    coalesce(sum(o.total), 0)::numeric(12, 2) as net_sales,
    coalesce(sum(o.total) filter (where o.payment_method = 'cash'), 0)::numeric(12, 2) as cash_sales,
    coalesce(sum(o.total) filter (where o.payment_method = 'card'), 0)::numeric(12, 2) as card_sales,
    coalesce(sum(o.total) filter (where o.payment_method = 'upi'), 0)::numeric(12, 2) as upi_sales
  from public.orders o
  where o.status = 'paid'
  group by o.business_date
),
voids as (
  select
    o.business_date,
    count(*)::int as voided_items,
    coalesce(sum(round(oi.qty * oi.unit_price_snapshot, 2)), 0)::numeric(12, 2) as voided_value
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.voided_at is not null
  group by o.business_date
),
cancelled as (
  select o.business_date, count(*)::int as cancelled_orders
  from public.orders o
  where o.status = 'cancelled'
  group by o.business_date
)
select
  d.business_date,
  coalesce(p.orders_count, 0) as orders_count,
  coalesce(p.covers, 0) as covers,
  coalesce(p.gross_sales, 0)::numeric(12, 2) as gross_sales,
  coalesce(p.discount_total, 0)::numeric(12, 2) as discount_total,
  coalesce(p.net_sales, 0)::numeric(12, 2) as net_sales,
  case
    when coalesce(p.orders_count, 0) = 0 then 0
    else round(p.net_sales / p.orders_count, 2)
  end::numeric(12, 2) as avg_ticket,
  coalesce(p.cash_sales, 0)::numeric(12, 2) as cash_sales,
  coalesce(p.card_sales, 0)::numeric(12, 2) as card_sales,
  coalesce(p.upi_sales, 0)::numeric(12, 2) as upi_sales,
  coalesce(v.voided_items, 0) as voided_items,
  coalesce(v.voided_value, 0)::numeric(12, 2) as voided_value,
  coalesce(c.cancelled_orders, 0) as cancelled_orders
from days d
left join paid p on p.business_date = d.business_date
left join voids v on v.business_date = d.business_date
left join cancelled c on c.business_date = d.business_date;

create or replace view public.v_sales_by_waiter
with (security_invoker = true) as
with paid as (
  select o.id, o.business_date, o.waiter_id, o.guest_count, o.subtotal, o.discount, o.total
  from public.orders o
  where o.status = 'paid'
),
item_counts as (
  select oi.order_id, sum(oi.qty)::int as items_count
  from public.order_items oi
  where oi.voided_at is null
  group by oi.order_id
)
select
  p.business_date,
  p.waiter_id,
  coalesce(pr.full_name, 'Unassigned') as waiter_name,
  count(*)::int as orders_count,
  coalesce(sum(p.guest_count), 0)::int as covers,
  coalesce(sum(ic.items_count), 0)::int as items_count,
  coalesce(sum(p.subtotal), 0)::numeric(12, 2) as gross_sales,
  coalesce(sum(p.discount), 0)::numeric(12, 2) as discount_total,
  coalesce(sum(p.total), 0)::numeric(12, 2) as net_sales,
  round(coalesce(sum(p.total), 0) / greatest(count(*), 1), 2)::numeric(12, 2) as avg_ticket
from paid p
left join item_counts ic on ic.order_id = p.id
left join public.profiles pr on pr.id = p.waiter_id
group by p.business_date, p.waiter_id, pr.full_name;

create or replace view public.v_sales_by_item
with (security_invoker = true) as
select
  o.business_date,
  oi.menu_item_id,
  oi.name_snapshot as item_name,
  mi.category_id,
  coalesce(mc.name, 'Uncategorised') as category_name,
  sum(oi.qty)::int as qty_sold,
  coalesce(sum(oi.line_total), 0)::numeric(12, 2) as gross_sales,
  count(distinct o.id)::int as orders_count
from public.order_items oi
join public.orders o on o.id = oi.order_id
left join public.menu_items mi on mi.id = oi.menu_item_id
left join public.menu_categories mc on mc.id = mi.category_id
where o.status = 'paid' and oi.voided_at is null
group by o.business_date, oi.menu_item_id, oi.name_snapshot, mi.category_id, mc.name;

create or replace view public.v_sales_hourly
with (security_invoker = true) as
select
  o.business_date,
  extract(hour from (o.closed_at at time zone 'Asia/Kolkata'))::int as hour,
  count(*)::int as orders_count,
  coalesce(sum(o.total), 0)::numeric(12, 2) as net_sales
from public.orders o
where o.status = 'paid' and o.closed_at is not null
group by o.business_date, extract(hour from (o.closed_at at time zone 'Asia/Kolkata'));

create or replace view public.v_table_turnover
with (security_invoker = true) as
select
  o.business_date,
  o.table_id,
  coalesce(dt.label, 'Takeaway / counter') as table_label,
  count(*)::int as orders_count,
  coalesce(sum(o.guest_count), 0)::int as covers,
  coalesce(sum(o.total), 0)::numeric(12, 2) as net_sales,
  round(
    avg(extract(epoch from (coalesce(o.closed_at, now()) - o.opened_at)) / 60)::numeric,
    1
  )::numeric(12, 2) as avg_minutes
from public.orders o
left join public.dining_tables dt on dt.id = o.table_id
where o.status = 'paid'
group by o.business_date, o.table_id, dt.label;

-- ---------------------------------------------------------------------------
-- Grants. RLS in the next migration decides which rows each role can reach.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.menu_items, public.menu_categories to anon, authenticated;
grant select on public.dining_tables, public.profiles to authenticated;
grant select, insert, update on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant update on public.profiles to authenticated;
grant insert, update, delete on public.menu_items to authenticated;
grant insert, update, delete on public.menu_categories to authenticated;
grant insert, update, delete on public.dining_tables to authenticated;
grant select on public.audit_log to authenticated;

grant select on
  public.v_sales_daily,
  public.v_sales_by_waiter,
  public.v_sales_by_item,
  public.v_sales_hourly,
  public.v_table_turnover
to authenticated;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.can_override() to authenticated;
grant execute on function public.is_privileged_connection() to authenticated;
grant execute on function public.business_date_for(timestamptz) to anon, authenticated;

-- Realtime: the floor grid and order screen listen to these two tables.
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.order_items;
exception when duplicate_object then null; end $$;
