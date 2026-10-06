# MINAR SEA FOOD — engineering notes

Read `PROJECT.md` first for state, routes, and workflow. This file covers traps and internals.

---

## Next.js 16 Gotchas

- Middleware is **`src/proxy.ts`** exporting `proxy()` (Node runtime, not `middleware.ts`).
- `src/shared/types/database.ts` is hand-maintained (includes `Relationships` for PostgREST).
- Redirect non-staff to `/admin/no-access` instead of throwing `forbidden()`.

---

## Database (`supabase/migrations/`)

**Tables:** `profiles`, `dining_tables`, `menu_categories`, `menu_items`, `sales`, `sale_items`, `business_days`, `audit_log`.  
**Enums:** `app_role` (`super_admin`, `manager`, `waiter`), `order_status`, `payment_method`.

### Migration Order
1. `20260918120000_schema.sql` — Core schema & RLS
2. `20260918120100_policies.sql` — Security policies
3. `20260930_counter_sale.sql` — Counter till tables, items, & recalculation triggers
4. `20261002_sale_table_link.sql` — Adds `sales.table_id` FK
5. `20261002_sale_table_billed_at.sql` — Adds `sales.table_billed_at` TIMESTAMPTZ
6. `20261005_manual_business_day.sql` — Adds `business_days` table, active index, & triggers

### Critical Invariants (Must Not Break)

1. **Money is never trusted from browser:** Browser sends `{menuItemId, qty}`. `line_total` is generated column (`qty * item_price`). `trg_recalc_sale_total` computes `subtotal` and `total` on write.
2. **Manual Business Day Enforcement:**
   - At most ONE open day (`ended_at IS NULL`) enforced by partial unique index `idx_business_days_single_active`.
   - `assign_sale_no()` strictly requires an active row in `business_days`. If closed, it throws `'No business day is currently open. Start the day first.'`.
   - `createSale()` and `settleTableBill()` query `getActiveBusinessDay()` and bind `business_date`.
   - `startDay()` reopens a closed day if started again for the same date.
3. **Daily Resetting Sale Numbers:** `sale_no` restarts per business date under advisory transaction lock (`trg_assign_sale_no`, `SECURITY DEFINER`).
4. **Table Live Status & Settlement:**
   - Table is **🟢 LIVE** if it has sales where `business_date = activeDay AND table_id = table.id AND table_billed_at IS NULL`.
   - `settleTableBill(tableId)` sets `table_billed_at = NOW()`, clearing the table back to `⚪ Available`.
5. **Security Invoker Views:** Reporting views (`v_counter_sales_daily`, `v_counter_sales_by_item`, `v_counter_sales_hourly`) run with `security_invoker = true`.

### Database Triggers & Functions

| Trigger / Function | Purpose |
| --- | --- |
| `trg_assign_sale_no` | Enforces active business day & mints resetting `#1`, `#2` sale numbers under advisory lock |
| `trg_recalc_sale_total` | Re-computes `subtotal` and `total` on `sale_items` changes |
| `guard_profile_changes` | Prevents non-super-admins from changing roles or demoting the last super admin |

### App-Level Operations

| Function | File | Purpose |
| --- | --- | --- |
| `startDay(date?)` | `modules/admin/sales/actions.ts` | Opens or reopens a business day session |
| `endDay()` | `modules/admin/sales/actions.ts` | Closes active business day (`ended_at = NOW()`) |
| `getActiveBusinessDay()` | `modules/admin/sales/queries.ts` | Returns currently open `business_days` row or `null` |
| `createSale()` | `modules/admin/sales/actions.ts` | Inserts sale header & items under active business day |
| `settleTableBill()` | `modules/admin/sales/actions.ts` | Sets `table_billed_at = NOW()` to settle customer table session |
| `getLiveTablesStatus()` | `modules/admin/sales/queries.ts` | Drives live green table monitor with unbilled totals |
| `getTableConsolidatedBill()` | `modules/admin/sales/queries.ts` | Aggregates all table session items into one consolidated printable bill |

---

## Auth Traps

- Google OAuth for owner; email + password for staff (`createStaff` via service role).
- Keep Email provider **ON**. Public signup **OFF**. All staff redirect to `/admin`.
- Google redirect URI points to Supabase (`https://hoxifrmqlrjdloyeaaed.supabase.co/auth/v1/callback`).
- App callback (`/admin/auth/callback`) must be allowed in Supabase Redirect URLs.
- `src/proxy.ts` must allow `/admin/auth/*` through without session.

---

## Code Map

```
src/
  proxy.ts                              /admin gate + cookie refresh
  app/
    (public)/                           Public pages: /, /menu, /contact (no admin links)
    (admin)/admin/
      login/, no-access/                Ungated
      auth/callback/route.ts            OAuth exchange
      (app)/layout.tsx                  Staff check + AdminShell (with DayControls)
      (app)/page.tsx                    Quick Sale POS screen
      (app)/tables/                     Dining tables CRUD & live green monitor
      (app)/history/                    Sales history log (defaults to active day)
      (app)/reports/                    Revenue, tickets, hourly, & top items
      (app)/menu/                       Menu category & dish management
      (print)/receipt/[saleId]/         Thermal receipt (single sale)
      (print)/table-receipt/[tableId]/  Consolidated thermal receipt (full table bill)
  modules/admin/
    components/day-controls.tsx         Interactive Start Day / End Day modals & indicators
    sales/                              actions.ts, queries.ts, components/quick-sale-view.tsx
    tables/                             actions.ts (table CRUD)
    menu/                               actions.ts (dish/category CRUD)
    reports/                            queries.ts, range.ts
    auth/                               session.ts, actions.ts
```
