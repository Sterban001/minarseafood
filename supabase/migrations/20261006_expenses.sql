-- =========================================================
-- Expenses Management (Salaries, Daily Items, Miscellaneous)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_date  DATE NOT NULL DEFAULT (public.business_date_for(now())),
  expense_type   TEXT NOT NULL CHECK (expense_type IN ('salary', 'daily_item', 'miscellaneous')),

  -- Tab 1: Daily Salaries
  staff_name     TEXT,
  role           TEXT,

  -- Tab 2: Daily Expenses (Itemized by item, qty, price)
  item_name      TEXT,
  quantity       NUMERIC(10,2),
  unit           TEXT DEFAULT 'kg',
  unit_price     NUMERIC(10,2),

  -- Tab 3: Others / Miscellaneous
  title          TEXT,

  -- Common fields
  category       TEXT,
  amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'card')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID REFERENCES auth.users(id)
);

-- Indices for fast daily queries and audit sorting
CREATE INDEX IF NOT EXISTS idx_expenses_date_type ON public.expenses (business_date DESC, expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON public.expenses (created_at DESC);

-- Trigger to auto-calculate amount for itemized daily expenses (quantity * unit_price)
CREATE OR REPLACE FUNCTION public.calc_expense_item_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.expense_type = 'daily_item' AND NEW.quantity IS NOT NULL AND NEW.unit_price IS NOT NULL THEN
    NEW.amount := ROUND(NEW.quantity * NEW.unit_price, 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_expense_item_amount ON public.expenses;
CREATE TRIGGER trg_calc_expense_item_amount
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.calc_expense_item_amount();

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated staff full read and write access
DROP POLICY IF EXISTS "staff_expenses_all" ON public.expenses;
CREATE POLICY "staff_expenses_all" ON public.expenses
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Reporting view for daily expenses summary
CREATE OR REPLACE VIEW public.v_daily_expenses_summary
WITH (security_invoker = true)
AS
SELECT
  e.business_date,
  COALESCE(SUM(CASE WHEN e.expense_type = 'salary' THEN e.amount ELSE 0 END), 0)::NUMERIC(10,2) AS total_salaries,
  COALESCE(SUM(CASE WHEN e.expense_type = 'daily_item' THEN e.amount ELSE 0 END), 0)::NUMERIC(10,2) AS total_items,
  COALESCE(SUM(CASE WHEN e.expense_type = 'miscellaneous' THEN e.amount ELSE 0 END), 0)::NUMERIC(10,2) AS total_misc,
  COALESCE(SUM(e.amount), 0)::NUMERIC(10,2) AS grand_total_expenses,
  COUNT(CASE WHEN e.expense_type = 'salary' THEN 1 END)::INT AS salary_count,
  COUNT(CASE WHEN e.expense_type = 'daily_item' THEN 1 END)::INT AS item_count,
  COUNT(CASE WHEN e.expense_type = 'miscellaneous' THEN 1 END)::INT AS misc_count
FROM public.expenses e
GROUP BY e.business_date;
