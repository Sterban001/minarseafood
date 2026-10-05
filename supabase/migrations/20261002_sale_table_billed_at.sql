-- =========================================================
-- Add table_billed_at timestamp to sales table
-- Tracks when the consolidated bill for a table was printed & settled.
-- =========================================================

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS table_billed_at TIMESTAMPTZ DEFAULT NULL;

-- Index for fast lookup of live/unprinted table sales
CREATE INDEX IF NOT EXISTS sales_table_unbilled_idx 
  ON sales (table_id) 
  WHERE table_id IS NOT NULL AND table_billed_at IS NULL;
