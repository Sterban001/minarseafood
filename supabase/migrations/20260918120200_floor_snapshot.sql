-- MINAR SEA FOOD — the floor grid
--
-- A waiter must not be able to read another waiter's bill, but they do need to
-- see that AC3 is busy and who is looking after it, or two of them will fight
-- over the same table. Row level security is row-shaped and cannot express
-- "these few columns for everyone, the rest only for the owner", so occupancy
-- is served by this SECURITY DEFINER function with a hand-picked column list.

create or replace function public.floor_snapshot()
returns table (
  table_id uuid,
  table_label text,
  zone text,
  seats integer,
  sort_order integer,
  order_id uuid,
  order_no integer,
  status public.order_status,
  waiter_id uuid,
  waiter_name text,
  guest_count integer,
  total numeric,
  item_count integer,
  opened_at timestamptz,
  billed_at timestamptz,
  is_mine boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_staff() then
    raise exception 'Not signed in as staff';
  end if;

  return query
  with live as (
    select
      o.id, o.order_no, o.table_id, o.waiter_id, o.status,
      o.guest_count, o.total, o.opened_at, o.billed_at
    from public.orders o
    where o.status in ('open', 'billed')
  ),
  counts as (
    select oi.order_id, sum(oi.qty)::int as item_count
    from public.order_items oi
    where oi.voided_at is null
    group by oi.order_id
  )
  -- Every active table, with its live order if it has one.
  select
    t.id, t.label, t.zone, t.seats, t.sort_order,
    l.id, l.order_no, l.status, l.waiter_id, p.full_name,
    l.guest_count, l.total, coalesce(c.item_count, 0),
    l.opened_at, l.billed_at,
    coalesce(l.waiter_id = auth.uid(), false)
  from public.dining_tables t
  left join live l on l.table_id = t.id
  left join public.profiles p on p.id = l.waiter_id
  left join counts c on c.order_id = l.id
  where t.is_active

  union all

  -- Takeaway and counter orders, which have no table.
  select
    null::uuid, 'Takeaway', 'Counter', 0, 9999,
    l.id, l.order_no, l.status, l.waiter_id, p.full_name,
    l.guest_count, l.total, coalesce(c.item_count, 0),
    l.opened_at, l.billed_at,
    coalesce(l.waiter_id = auth.uid(), false)
  from live l
  left join public.profiles p on p.id = l.waiter_id
  left join counts c on c.order_id = l.id
  where l.table_id is null

  order by 5, 2;
end;
$$;

comment on function public.floor_snapshot() is
  'Occupancy for the floor grid. Deliberately exposes only non-sensitive columns
   so a waiter can see a table is busy without reading the bill on it.';

grant execute on function public.floor_snapshot() to authenticated;
