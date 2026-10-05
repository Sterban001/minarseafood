-- =========================================================
-- Manual Business Day Start / End
-- =========================================================

CREATE TABLE IF NOT EXISTS public.business_days (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ,  -- NULL means day is currently open
  started_by  UUID REFERENCES auth.users(id),
  ended_by    UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most ONE business day can be active (ended_at IS NULL) at any time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_days_single_active
  ON public.business_days ((ended_at IS NULL))
  WHERE ended_at IS NULL;

-- Fast index by date for queries and history
CREATE INDEX IF NOT EXISTS idx_business_days_date ON public.business_days (date DESC);

-- Enable Row Level Security
ALTER TABLE public.business_days ENABLE ROW LEVEL SECURITY;

-- Allow authenticated staff full access to business_days
DROP POLICY IF EXISTS "staff_business_days_all" ON public.business_days;
CREATE POLICY "staff_business_days_all" ON public.business_days
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous read if necessary for customer receipts / kiosks
DROP POLICY IF EXISTS "anon_business_days_read" ON public.business_days;
CREATE POLICY "anon_business_days_read" ON public.business_days
  FOR SELECT TO anon
  USING (true);

-- Update assign_sale_no trigger to use the active business day
CREATE OR REPLACE FUNCTION public.assign_sale_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date DATE;
  v_lock BIGINT;
  v_next INT;
BEGIN
  -- Use the currently open business day
  SELECT date INTO v_date
    FROM public.business_days
    WHERE ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1;

  IF v_date IS NULL THEN
    RAISE EXCEPTION 'No business day is currently open. Start the day first.';
  END IF;

  NEW.business_date := v_date;

  v_lock := ('x' || md5('sale_no_' || v_date::text))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock);

  SELECT COALESCE(MAX(sale_no), 0) + 1 INTO v_next
    FROM public.sales WHERE business_date = v_date;

  NEW.sale_no := v_next;
  RETURN NEW;
END;
$$;

-- Ensure trigger is active on sales table
DROP TRIGGER IF EXISTS trg_assign_sale_no ON public.sales;
CREATE TRIGGER trg_assign_sale_no
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_sale_no();
