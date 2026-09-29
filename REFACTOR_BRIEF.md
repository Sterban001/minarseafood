# MINAR SEA FOOD — Counter-Sale Refactor Brief

> **Status:** Fully implemented (30 Sep 2026). All requirements, routes, database tables, and reports are completed. Read `PROJECT.md` and `HANDOVER.md` for current documentation.

---

## 1. What changed and why

The restaurant no longer runs a "waiter opens an order on a table → accumulates
items → settles at the end" workflow. The owner now sits at the counter. Waiters
walk up, name items, the owner punches them in, takes **cash immediately**, and
hands the waiter a small printed receipt. There are no tables, no waiters to
track, and no order lifecycle.

**New model: punch items → total → take cash → print receipt → next customer.**

---

## 2. What to build

### 2.1 Quick Sale page (`/admin` — the new default)

- A full-screen menu grid grouped by category (tappable cards, tablet-friendly).
- Tapping an item adds it to a cart sidebar (or bottom panel on mobile).
- Cart shows items with qty +/− controls, line totals, and a grand total.
- **"Charge ₹X"** button → creates the sale record in the DB → shows a success
  state with the sale number → option to **print receipt**.
- After charge, the cart clears and is ready for the next customer.
- No table selection, no waiter selection, no payment method picker (always cash).

### 2.2 Receipt page (`/admin/receipt/[saleId]`)

- Minimal printable slip: restaurant name, sale #, date/time, items with qty &
  price, total.
- Uses `@media print` styles already in `globals.css`.
- Auto-triggers `window.print()` on load (same pattern as existing
  `/admin/bills/[orderId]`).

### 2.3 Sales History page (`/admin/history`)

- Scrollable list of today's sales (filterable by date).
- Each row: sale #, time, item count, total, "Reprint" link.
- Tap a sale to see its items.

### 2.4 Reports page (`/admin/reports`) — **keep but simplify**

- **Daily summary**: sale count, total revenue, average ticket.
- **Item-wise breakdown**: qty sold and revenue per dish, per day/range.
- **Hourly breakdown**: sales per hour.
- Remove: waiter reports, table turnover, covers, voids, discounts, CSV export.
- Reports should query the new `sales` + `sale_items` tables (see §4).

### 2.5 Menu management (`/admin/menu`) — **keep as-is**

- Categories and dishes CRUD. The existing `src/modules/admin/menu/actions.ts`
  works. Just remove the table/section CRUD actions (`saveTable`, `deleteTable`,
  `saveSection`, `deleteSection`) since tables are gone.

### 2.6 Navigation — simplify

The admin sidebar/bottom nav should have only:
| Nav item | Route | Icon |
|---|---|---|
| **Sale** | `/admin` | `ShoppingCart` or `CreditCard` |
| **History** | `/admin/history` | `ClipboardList` |
| **Reports** | `/admin/reports` | `TrendingUp` |
| **Menu** | `/admin/menu` | `BookOpenText` |

Remove: Floor, Live orders, Table setup, Staff, Audit.

---

## 3. What to remove from the UI

> Do NOT delete the old DB tables or data. Only remove/replace UI routes and modules.

### Routes to delete:
```
src/app/(admin)/admin/(app)/tables/         → delete (floor grid)
src/app/(admin)/admin/(app)/orders/         → delete (live orders + detail)
src/app/(admin)/admin/(app)/floor-setup/    → delete (table CRUD)
src/app/(admin)/admin/(app)/staff/          → delete (staff management)
src/app/(admin)/admin/(app)/audit/          → delete (audit trail)
src/app/(admin)/admin/(print)/bills/        → replace with /receipt/[saleId]
```

### Modules to delete:
```
src/modules/admin/pos/        → delete (order lifecycle, floor actions)
src/modules/admin/staff/      → delete (staff CRUD, password resets)
src/modules/admin/audit/      → delete (audit log viewer)
```

### Modules to simplify:
```
src/modules/admin/reports/    → rewrite queries for new sales tables
src/modules/admin/components/ → simplify nav-items.ts, admin-shell.tsx
src/modules/admin/auth/       → keep login, simplify session (no role checks needed — owner only)
src/modules/admin/menu/       → keep category + dish CRUD, remove table/section CRUD
```

---

## 4. New database tables

**Apply this SQL in the Supabase dashboard SQL editor** (no CLI, no Docker).
The migration must be re-runnable (`CREATE TABLE IF NOT EXISTS`, etc.).

```sql
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
```

---

## 5. TypeScript types to add to `database.ts`

Add these to `src/shared/types/database.ts` alongside the existing types.
The old types can stay (they don't hurt).

```typescript
// -- New counter-sale types --

// In Database.public.Tables, add:
sales: {
  Row: {
    id: string;
    sale_no: number;
    business_date: string;
    subtotal: number;
    total: number;
    created_at: string;
    created_by: string | null;
  };
  Insert: {
    id?: string;
    business_date?: string;
    subtotal?: number;
    total?: number;
    created_by?: string | null;
  };
  Update: {
    subtotal?: number;
    total?: number;
  };
  Relationships: [];
};

sale_items: {
  Row: {
    id: string;
    sale_id: string;
    menu_item_id: string | null;
    item_name: string;
    item_price: number;
    qty: number;
    line_total: number;
    created_at: string;
  };
  Insert: {
    id?: string;
    sale_id: string;
    menu_item_id?: string | null;
    item_name: string;
    item_price: number;
    qty?: number;
  };
  Update: {
    qty?: number;
  };
  Relationships: [
    {
      foreignKeyName: "sale_items_sale_id_fkey";
      columns: ["sale_id"];
      isOneToOne: false;
      referencedRelation: "sales";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "sale_items_menu_item_id_fkey";
      columns: ["menu_item_id"];
      isOneToOne: false;
      referencedRelation: "menu_items";
      referencedColumns: ["id"];
    },
  ];
};

// In Database.public.Views, add:
v_counter_sales_daily: {
  Row: {
    business_date: string;
    sale_count: number;
    revenue: number;
    avg_ticket: number;
  };
  Relationships: [];
};

v_counter_sales_by_item: {
  Row: {
    business_date: string;
    menu_item_id: string | null;
    item_name: string;
    qty_sold: number;
    revenue: number;
    sale_count: number;
  };
  Relationships: [];
};

v_counter_sales_hourly: {
  Row: {
    business_date: string;
    hour: number;
    sale_count: number;
    revenue: number;
  };
  Relationships: [];
};

// Convenience aliases:
export type Sale = Tables<"sales">;
export type SaleItem = Tables<"sale_items">;
export type CounterSalesDaily = Views<"v_counter_sales_daily">;
export type CounterSalesByItem = Views<"v_counter_sales_by_item">;
export type CounterSalesHourly = Views<"v_counter_sales_hourly">;
```

---

## 6. What to keep untouched

| File / area | Why |
|---|---|
| **Public site** (`src/app/(public)/`, `src/modules/public/`) | Completely separate; no changes needed |
| **`src/proxy.ts`** | Still gates `/admin` routes — works as-is |
| **`src/shared/supabase/`** (`server.ts`, `client.ts`, `admin.ts`, `env.ts`) | Supabase clients are fine |
| **`src/shared/lib/dates.ts`** | `businessDateFor()` is used by reports and the new sale_no |
| **`src/shared/lib/money.ts`** | `formatMoney()`, `formatAmount()` used everywhere |
| **`src/shared/ui/`** | Shared UI components (button, form, table, surface) |
| **`src/shared/config/restaurant.ts`** | Restaurant details for receipts |
| **`src/modules/admin/lib/action-result.ts`** | `guarded()`, `done()`, `fail()` pattern — keep |
| **`src/modules/admin/auth/`** | Keep login flow. Simplify: owner is the only user, but `requireStaff()` still works |
| **`src/modules/admin/components/action-form.tsx`** | Form wrapper — keep |
| **`src/modules/admin/components/admin-shell.tsx`** | Shell layout — simplify the sidebar/nav |
| **`src/modules/admin/components/popover.tsx`** | Confirmation dialogs — keep |
| **Old DB tables** (`orders`, `order_items`, `dining_tables`, `profiles`, `audit_log`) | **Do not drop.** Real data. Just unused by the new UI. |
| **`globals.css`** | All styles stay. The admin POS uses Tailwind tokens from `@theme`. |
| **`next.config.ts`** | Image patterns for Supabase storage — stays |

---

## 7. Key files to know

| File | Purpose |
|---|---|
| `src/proxy.ts` | Next.js 16 middleware — exports `proxy()`, not `middleware()` |
| `src/app/(admin)/admin/(app)/layout.tsx` | Gate: `requireStaff()` + `<AdminShell>` |
| `src/app/(admin)/admin/layout.tsx` | Admin root layout |
| `src/modules/admin/auth/session.ts` | `requireStaff()`, `lookupStaff()`, `homeForRole()` — update `homeForRole` to always return `/admin` |
| `src/modules/admin/components/nav-items.ts` | Navigation config — replace with 4-item nav |
| `src/modules/admin/components/admin-shell.tsx` | Sidebar + header + bottom nav — simplify |
| `src/modules/admin/menu/actions.ts` | Menu CRUD server actions — remove table/section actions |
| `src/modules/admin/lib/action-result.ts` | `guarded()` wrapper for server actions |
| `src/shared/types/database.ts` | Hand-maintained Supabase types — add sale types |
| `src/shared/lib/dates.ts` | `businessDateFor()`, `todayBusinessDate()`, formatters |
| `src/shared/lib/money.ts` | `formatMoney()`, `formatAmount()`, `round2()` |
| `src/shared/config/restaurant.ts` | Name, address, phone — used on receipts |

---

## 8. Tech stack & constraints

- **Next.js 16.3.5**, App Router, Turbopack, React 19.2, TypeScript strict
- **Tailwind v4** (`@theme` in `globals.css`) — NOT v3 `tailwind.config`
- Middleware = `src/proxy.ts` exporting `proxy()` (Next.js 16 style)
- `cookies()`, `params`, `searchParams` are **async** in Next.js 16
- **No Supabase CLI, no Docker.** SQL is pasted into the Supabase dashboard SQL
  editor. Migrations must be re-runnable.
- `.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Supabase ref**: `hoxifrmqlrjdloyeaaed`
- Deploy: Vercel at `https://minarseafood.com`
- Read `node_modules/next/dist/docs/` for Next.js 16 API docs before coding
- Read `AGENTS.md` in the repo root

---

## 9. Execution order

1. **SQL first**: Paste the migration SQL (§4) into the Supabase SQL editor.
2. **Types**: Update `database.ts` with the new table/view types (§5).
3. **New server actions**: Create `src/modules/admin/sales/actions.ts` —
   `createSale(items: {menuItemId, qty}[])` that inserts into `sales` +
   `sale_items` and returns the sale ID and sale_no.
4. **Quick Sale page**: Build the new `/admin` page with menu grid + cart.
5. **Receipt page**: Build `/admin/receipt/[saleId]`.
6. **History page**: Build `/admin/history`.
7. **Reports**: Rewrite queries to use new views.
8. **Navigation**: Update `nav-items.ts` and `admin-shell.tsx`.
9. **Cleanup**: Delete old routes and modules listed in §3.
10. **Update `homeForRole()`** in `session.ts` to return `/admin`.
11. **Update `PROJECT.md` and `HANDOVER.md`** to reflect the new architecture.

---

## 10. Design guidance

- The admin POS uses **Geist Sans** + **Playfair Display** (via `globals.css` `@theme`).
  Do NOT use the public site's Plus Jakarta Sans or ocean theme in admin.
- Keep the existing admin color palette: `brand-*` (teal) and `spice-*` (warm gold).
- The Quick Sale screen should be **tablet-first**: large tap targets, big item
  cards, visible cart total. Think cash register, not e-commerce.
- Keep it simple and fast — the owner taps 50–100 sales a day.
- Receipt should be a narrow, clean printable slip.

---

## 11. What NOT to do

- Do NOT drop old database tables — they have real sales data.
- Do NOT change the public site (`/`, `/menu`, `/contact`).
- Do NOT change `AGENTS.md` or `CLAUDE.md` — auto-generated by `next dev`.
- Do NOT add waiter/table tracking — it's been explicitly removed.
- Do NOT add payment method selection — it's always cash.
- Do NOT add discounts, voids, or order status — sales are final and instant.
- Do NOT add public signup or link `/admin` from the public site.
- Do NOT re-seed or overwrite menu items.
