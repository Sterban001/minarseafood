-- =========================================================
-- Speed & Reporting Performance Indexes
-- Eliminates table scans on sales and sale items for fast reports,
-- live tables, and receipt lookups.
-- =========================================================

-- 1. Index on business_date for daily sales queries and history lookups
CREATE INDEX IF NOT EXISTS idx_sales_business_date 
  ON public.sales (business_date DESC);

-- 2. Index on table sales per business day for fast live table status and bills
CREATE INDEX IF NOT EXISTS idx_sales_business_date_table 
  ON public.sales (business_date, table_id) 
  WHERE table_id IS NOT NULL;

-- 3. Foreign key index on sale_items.sale_id to accelerate joins with sales
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id 
  ON public.sale_items (sale_id);

-- 4. Index on menu_item_id for fast best-seller aggregation
CREATE INDEX IF NOT EXISTS idx_sale_items_menu_item_id 
  ON public.sale_items (menu_item_id) 
  WHERE menu_item_id IS NOT NULL;
