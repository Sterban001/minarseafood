-- MINAR SEA FOOD — starter data.
-- Safe to run more than once: every insert is idempotent.
--
-- Hosted project: paste this into the Supabase SQL editor after the migrations.
-- Local: `npm run db:reset` runs it automatically.

-- ---------------------------------------------------------------------------
-- Floor plan
-- ---------------------------------------------------------------------------

insert into public.dining_tables (label, seats, zone, sort_order)
values
  ('T1', 4, 'Main Hall', 1),
  ('T2', 4, 'Main Hall', 2),
  ('T3', 4, 'Main Hall', 3),
  ('T4', 6, 'Main Hall', 4),
  ('T5', 6, 'Main Hall', 5),
  ('T6', 2, 'Main Hall', 6),
  ('T7', 4, 'Main Hall', 7),
  ('T8', 4, 'Main Hall', 8),
  ('AC1', 4, 'AC Hall', 11),
  ('AC2', 4, 'AC Hall', 12),
  ('AC3', 6, 'AC Hall', 13),
  ('AC4', 6, 'AC Hall', 14),
  ('AC5', 8, 'AC Hall', 15),
  ('F1', 6, 'Family Rooms', 21),
  ('F2', 6, 'Family Rooms', 22),
  ('F3', 8, 'Family Rooms', 23),
  ('R1', 4, 'Rooftop', 31),
  ('R2', 4, 'Rooftop', 32),
  ('R3', 6, 'Rooftop', 33)
on conflict (label) do nothing;

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------

insert into public.menu_categories (name, sort_order)
values
  ('Starters', 1),
  ('Tandoor & Grill', 2),
  ('Crab Specials', 3),
  ('Curries', 4),
  ('Fry & Tawa', 5),
  ('Biryani & Rice', 6),
  ('Breads', 7),
  ('Beverages', 8),
  ('Desserts', 9)
on conflict (name) do nothing;

insert into public.menu_items
  (category_id, name, description, price, is_featured, sort_order)
select
  c.id, v.name, v.description, v.price::numeric(10, 2), v.featured, v.sort
from (
  values
    -- Starters
    ('Starters', 'Koliwada Prawns', 'Chilli-and-garlic batter, crisp fried, lime on the side', 420::numeric, true, 1),
    ('Starters', 'Squid Rings', 'Rava crusted calamari with house tartare', 380, false, 2),
    ('Starters', 'Fish Fingers', 'Boneless surmai, breadcrumb crust', 340, false, 3),
    ('Starters', 'Prawn Pepper Fry', 'Dry tossed with crushed pepper and curry leaf', 440, false, 4),
    ('Starters', 'Clams Sukka', 'Coconut, roasted spice, plenty of shell', 360, false, 5),
    ('Starters', 'Chicken 65', 'For the one at the table who does not eat fish', 280, false, 6),
    ('Starters', 'Mushroom Ghee Roast', 'Ghee, byadgi chilli, jaggery', 260, false, 7),

    -- Tandoor & Grill
    ('Tandoor & Grill', 'Tandoori Pomfret', 'Whole pomfret, overnight marinade, clay oven', 780, true, 1),
    ('Tandoor & Grill', 'Grilled Lobster (half)', 'Butter, garlic, charcoal', 1450, true, 2),
    ('Tandoor & Grill', 'Tandoori Prawns', 'Jumbo prawns, hung curd and ajwain', 620, false, 3),
    ('Tandoor & Grill', 'Fish Tikka', 'Boneless cubes, mint chutney', 460, false, 4),
    ('Tandoor & Grill', 'Grilled Squid', 'Lemon, pepper, olive oil', 420, false, 5),
    ('Tandoor & Grill', 'Chicken Tikka', 'Classic, six pieces', 340, false, 6),

    -- Crab Specials
    ('Crab Specials', 'Butter Pepper Garlic Crab', 'Our signature — full crab, cracked to order', 980, true, 1),
    ('Crab Specials', 'Crab Masala', 'Thick onion-tomato masala, coriander', 880, false, 2),
    ('Crab Specials', 'Crab Sukka', 'Dry coconut roast, Mangalorean style', 900, false, 3),
    ('Crab Specials', 'Crab Rasam', 'Peppery broth, served in a bowl', 320, false, 4),

    -- Curries
    ('Curries', 'Meen Moilee', 'Coconut milk, green chilli, raw mango', 520, true, 1),
    ('Curries', 'Prawn Coconut Curry', 'Kokum, curry leaf, fresh coconut', 540, false, 2),
    ('Curries', 'Fish Curry (Surmai)', 'Kolhapuri masala, tamarind', 480, false, 3),
    ('Curries', 'Mussel Curry', 'Kerala style, shallots and pepper', 420, false, 4),
    ('Curries', 'Prawn Ghee Roast', 'Mangalore classic, deep red and rich', 580, false, 5),
    ('Curries', 'Egg Curry', 'Two eggs, coconut gravy', 240, false, 6),
    ('Curries', 'Dal Fry', 'Tadka of cumin and dry chilli', 210, false, 7),

    -- Fry & Tawa
    ('Fry & Tawa', 'Pomfret Fry (whole)', 'Rava coated, shallow fried', 720, true, 1),
    ('Fry & Tawa', 'Surmai Fry (2 pcs)', 'Thick cut kingfish steaks', 560, false, 2),
    ('Fry & Tawa', 'Bangda Fry (2 pcs)', 'Mackerel, red masala', 300, false, 3),
    ('Fry & Tawa', 'Bombil Fry (4 pcs)', 'Bombay duck, semolina crust', 320, false, 4),
    ('Fry & Tawa', 'Prawn Rava Fry', 'Crisp outside, plump inside', 460, false, 5),
    ('Fry & Tawa', 'Tawa Squid Masala', 'Pan tossed with onion and capsicum', 400, false, 6),

    -- Biryani & Rice
    ('Biryani & Rice', 'Prawn Biryani', 'Seeraga samba rice, served with raita', 480, true, 1),
    ('Biryani & Rice', 'Fish Biryani', 'Boneless, dum cooked', 460, false, 2),
    ('Biryani & Rice', 'Crab Biryani', 'Weekend special, ask the waiter', 620, false, 3),
    ('Biryani & Rice', 'Chicken Biryani', 'Long grain, bone-in', 360, false, 4),
    ('Biryani & Rice', 'Neer Dosa (3 pcs)', 'The right partner for any curry', 120, false, 5),
    ('Biryani & Rice', 'Steamed Rice', 'Plate', 140, false, 6),
    ('Biryani & Rice', 'Ghee Rice', 'Fried onion, cashew', 200, false, 7),

    -- Breads
    ('Breads', 'Butter Naan', '', 70, false, 1),
    ('Breads', 'Tandoori Roti', '', 45, false, 2),
    ('Breads', 'Garlic Kulcha', '', 90, false, 3),
    ('Breads', 'Appam (2 pcs)', 'Soft centre, lacy edge', 90, false, 4),
    ('Breads', 'Malabar Parotta', '', 60, false, 5),

    -- Beverages
    ('Beverages', 'Fresh Lime Soda', 'Sweet, salt or mixed', 90, false, 1),
    ('Beverages', 'Tender Coconut', 'Served in the shell', 110, false, 2),
    ('Beverages', 'Sol Kadhi', 'Kokum and coconut milk, chilled', 120, true, 3),
    ('Beverages', 'Buttermilk', 'Curry leaf and ginger', 80, false, 4),
    ('Beverages', 'Masala Soda', '', 80, false, 5),
    ('Beverages', 'Filter Coffee', '', 70, false, 6),
    ('Beverages', 'Mineral Water (1 L)', '', 40, false, 7),

    -- Desserts
    ('Desserts', 'Tender Coconut Pudding', 'House favourite', 180, true, 1),
    ('Desserts', 'Gulab Jamun (2 pcs)', 'Warm, with syrup', 140, false, 2),
    ('Desserts', 'Payasam', 'Ask for today''s version', 150, false, 3),
    ('Desserts', 'Ice Cream Scoop', 'Vanilla, chocolate or tender coconut', 120, false, 4)
) as v(category, name, description, price, featured, sort)
join public.menu_categories c on c.name = v.category
on conflict (category_id, name) do nothing;

-- Blank descriptions read better as NULL on the public menu.
update public.menu_items set description = null where description = '';

-- ---------------------------------------------------------------------------
-- First super admin
--
-- Chicken and egg problem: only a super admin can promote people, so the very
-- first one has to be set here.
--
-- 1. Supabase dashboard -> Authentication -> Users -> "Add user" (confirm the
--    email so the login works straight away).
-- 2. Run this file. The block below promotes the oldest account, and only ever
--    fires while no active super admin exists, so it is a no-op afterwards.
-- ---------------------------------------------------------------------------

do $$
declare
  v_first uuid;
begin
  if exists (
    select 1 from public.profiles where role = 'super_admin' and is_active
  ) then
    raise notice 'Super admin already exists — nothing to promote.';
    return;
  end if;

  select p.id into v_first
  from public.profiles p
  order by p.created_at asc
  limit 1;

  if v_first is null then
    raise notice 'No staff accounts yet. Create one in Authentication -> Users, then re-run this file.';
    return;
  end if;

  update public.profiles
  set role = 'super_admin', is_active = true
  where id = v_first;

  raise notice 'Promoted % to super_admin.', v_first;
end $$;
