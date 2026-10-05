-- =========================================================
-- Link sales to dining tables (optional).
-- A sale can optionally be tied to a table so that the
-- receipt / final bill shows "Table T3" etc.
-- =========================================================

-- 1. Add nullable FK column.
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES dining_tables(id) ON DELETE SET NULL;

-- 2. Index for finding open/recent sales on a given table.
CREATE INDEX IF NOT EXISTS sales_table_id_idx ON sales (table_id) WHERE table_id IS NOT NULL;

-- 3. Grants are already ALL for authenticated on sales via the existing policy,
--    so no new grants or policies needed.
