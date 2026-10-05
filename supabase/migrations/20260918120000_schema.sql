-- MINAR SEA FOOD — core schema
-- Tables, integrity triggers, audit triggers.
-- Row level security lives in the next migration.
-- Counter-sale tables (sales, sale_items, reporting views) are in 20260930_counter_sale.sql.

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
-- Audit triggers
-- ---------------------------------------------------------------------------

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
-- Grants. RLS in the next migration decides which rows each role can reach.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.menu_items, public.menu_categories to anon, authenticated;
grant select on public.dining_tables, public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant insert, update, delete on public.menu_items to authenticated;
grant insert, update, delete on public.menu_categories to authenticated;
grant insert, update, delete on public.dining_tables to authenticated;
grant select on public.audit_log to authenticated;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.can_override() to authenticated;
grant execute on function public.is_privileged_connection() to authenticated;
grant execute on function public.business_date_for(timestamptz) to anon, authenticated;
