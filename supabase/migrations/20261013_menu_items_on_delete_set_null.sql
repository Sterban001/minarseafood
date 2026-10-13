-- =========================================================
-- Allow menu items to be deleted without violating FK
-- constraints on past sale items.
-- Past bills and reports snapshot item_name and item_price,
-- so historical reporting remains intact.
-- =========================================================

ALTER TABLE public.sale_items
  DROP CONSTRAINT IF EXISTS sale_items_menu_item_id_fkey;

ALTER TABLE public.sale_items
  ADD CONSTRAINT sale_items_menu_item_id_fkey
  FOREIGN KEY (menu_item_id)
  REFERENCES public.menu_items(id)
  ON DELETE SET NULL;
