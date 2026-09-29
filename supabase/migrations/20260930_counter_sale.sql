-- =========================================================
-- Counter-sale tables for the new cash-register workflow
-- =========================================================

-- Reuse the existing business_date_for() function (already in the DB).

CREATE TABLE IF NOT EXISTS sales (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_no     INT NOT NULL,
  business_date DATE NOT NULL DEFAULT (business_date_for(now())),
  subtotal    NUMERIC(10,2) NOT NULL DEFAULT 0,
  total       NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS sale_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id             UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  menu_item_id        UUID REFERENCES menu_items(id),
  item_name           TEXT NOT NULL,
  item_price          NUMERIC(10,2) NOT NULL,
  qty                 INT NOT NULL DEFAULT 1,
  line_total          NUMERIC(10,2) GENERATED ALWAYS AS (qty * item_price) STORED,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily sale_no counter (resets each business day, like the old order_no).
-- Use an advisory lock to prevent duplicates under concurrent inserts.
CREATE OR REPLACE FUNCTION assign_sale_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date DATE;
  v_lock BIGINT;
  v_next INT;
BEGIN
  v_date := COALESCE(NEW.business_date, business_date_for(now()));
  NEW.business_date := v_date;

  v_lock := ('x' || md5('sale_no_' || v_date::text))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock);

  SELECT COALESCE(MAX(sale_no), 0) + 1 INTO v_next
    FROM sales WHERE business_date = v_date;

  NEW.sale_no := v_next;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_sale_no ON sales;
CREATE TRIGGER trg_assign_sale_no
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION assign_sale_no();

-- Recalculate sale total whenever items change.
CREATE OR REPLACE FUNCTION recalc_sale_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id UUID;
  v_total NUMERIC(10,2);
BEGIN
  v_sale_id := COALESCE(NEW.sale_id, OLD.sale_id);

  SELECT COALESCE(SUM(qty * item_price), 0) INTO v_total
    FROM sale_items WHERE sale_id = v_sale_id;

  UPDATE sales SET subtotal = v_total, total = v_total
    WHERE id = v_sale_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_sale_total ON sale_items;
CREATE TRIGGER trg_recalc_sale_total
  AFTER INSERT OR UPDATE OR DELETE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION recalc_sale_total();

-- RLS: only authenticated users can read/write sales.
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_sales_all" ON sales;
CREATE POLICY "staff_sales_all" ON sales
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "staff_sale_items_all" ON sale_items;
CREATE POLICY "staff_sale_items_all" ON sale_items
  FOR ALL USING (auth.role() = 'authenticated');

-- =========================================================
-- Reporting views for the new sales tables
-- =========================================================

CREATE OR REPLACE VIEW v_counter_sales_daily
WITH (security_invoker = true)
AS
SELECT
  s.business_date,
  COUNT(*)::INT          AS sale_count,
  COALESCE(SUM(s.total), 0) AS revenue,
  ROUND(COALESCE(AVG(s.total), 0), 2) AS avg_ticket
FROM sales s
GROUP BY s.business_date;

CREATE OR REPLACE VIEW v_counter_sales_by_item
WITH (security_invoker = true)
AS
SELECT
  s.business_date,
  si.menu_item_id,
  si.item_name,
  SUM(si.qty)::INT                AS qty_sold,
  COALESCE(SUM(si.line_total), 0) AS revenue,
  COUNT(DISTINCT si.sale_id)::INT AS sale_count
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
GROUP BY s.business_date, si.menu_item_id, si.item_name;

CREATE OR REPLACE VIEW v_counter_sales_hourly
WITH (security_invoker = true)
AS
SELECT
  s.business_date,
  EXTRACT(HOUR FROM s.created_at AT TIME ZONE 'Asia/Kolkata')::INT AS hour,
  COUNT(*)::INT          AS sale_count,
  COALESCE(SUM(s.total), 0) AS revenue
FROM sales s
GROUP BY s.business_date, hour;
