# MINAR SEA FOOD — engineering notes

**Read `PROJECT.md` first.** State, routes, roles, and the checklist live there.
This file is what breaks if you change it.

---

## Next.js 16 gotchas

- Middleware is **`src/proxy.ts`** exporting `proxy()`, Node runtime, no `middleware.ts`.
- `unauthorized()` / `forbidden()` need experimental `authInterrupts` — we redirect to `/admin/no-access` instead.
- `src/shared/types/database.ts` is **hand-written** (includes `Relationships` for nested PostgREST). `npm run db:types` writes a comparison copy to `supabase/types.generated.ts` and does **not** overwrite it.

---

## Database (`supabase/migrations/`)

Tables: `profiles`, `dining_tables`, `menu_categories`, `menu_items`, `sales`, `sale_items`, `audit_log`. Enums: `app_role`, `order_status`, `payment_method`.

Migration Order:
1. `20260918120000_schema.sql`
2. `20260918120100_policies.sql`
3. `20260930_counter_sale.sql`
4. `20261002_sale_table_link.sql` (adds `sales.table_id` FK)
5. `20261002_sale_table_billed_at.sql` (adds `sales.table_billed_at` TIMESTAMPTZ)

Must not break:

- **Money is never trusted from the browser.** The app sends `{menuItemId, qty}`. `line_total` is a generated column (`qty * item_price`); `recalc_sale_total()` trigger derives `subtotal` and `total` on every write.
- **Sales day is 5am–5am, Asia/Kolkata.** Keep `business_date_for()` in SQL in step with `businessDateFor()` in `src/shared/lib/dates.ts`.
- **`sale_no` restarts each sales day** under a per-day advisory lock (`trg_assign_sale_no`). `assign_sale_no()` is `SECURITY DEFINER` so concurrent client inserts cannot mint duplicate sale numbers.
- **Table Session Settlement & Live Status**:
  - `sales.table_id` links a sale to a dining table.
  - `sales.table_billed_at` is `NULL` for active unbilled sales.
  - A table is **LIVE (`🟢 LIVE`)** if it has sales today where `table_id = table.id AND table_billed_at IS NULL`.
  - `settleTableBill(tableId)` updates `table_billed_at = NOW()`, closing the table session and turning it back to available (`⚪ Available`).
- **Reporting views use `security_invoker = true`.** `v_counter_sales_daily`, `v_counter_sales_by_item`, `v_counter_sales_hourly` respect RLS.

| Trigger / Function | Purpose |
| --- | --- |
| `trg_assign_sale_no` | Mints daily resetting sale numbers (`#1`, `#2`) per business date under advisory lock |
| `trg_recalc_sale_total` | Re-computes sale `subtotal` and `total` whenever `sale_items` are inserted/deleted/updated |
| `guard_profile_changes` | Non-super-admins changing roles; last active super admin demoted or switched off |

App-level table-session logic (not Postgres functions):

| Function (app code) | Location | Purpose |
| --- | --- | --- |
| `settleTableBill()` | `modules/admin/sales/actions.ts` | Server action — sets `table_billed_at = NOW()` on unbilled sales for a table to mark the session settled |
| `getLiveTablesStatus()` | `modules/admin/sales/queries.ts` | Queries unbilled sales for today grouped by `table_id` to drive the 🟢 LIVE green table UI |
| `getTableConsolidatedBill()` | `modules/admin/sales/queries.ts` | Aggregates all item sales for a table session into a single consolidated bill for printing |

---

## Auth traps

Google = owner. Email+password = staff (`createStaff` + service role).
Keep the Email provider **on**. Public signup **off**.
`homeForRole()` redirects all authenticated staff to `/admin` (Quick Sale).

- **`proxy.ts` must let `/admin/auth/*` through.** The callback arrives with no session. Gating it makes Google look like a Supabase failure.
- Google's redirect URI is **Supabase's**: `https://hoxifrmqlrjdloyeaaed.supabase.co/auth/v1/callback`. Ours (`/admin/auth/callback`) must be in Auth → URL Configuration → Redirect URLs.
- Callback errors are **codes**, not sentences (`login-errors.ts`).
- `adminDestination()` in `session.ts` is the only open-redirect check.

---

## Code map

```
src/
  proxy.ts                              /admin gate + cookie refresh
  app/
    layout.tsx                          document shell
    (public)/                           3 pages — no /admin links
    (admin)/admin/
      login/, no-access/                ungated
      auth/callback/route.ts            ungated on purpose
      (app)/layout.tsx                  requireStaff() + AdminShell
      (app)/                            Quick Sale main screen (mandatory table/takeaway selector)
      (app)/tables/                     Dining tables CRUD & live green table monitor (🟢 LIVE)
      (app)/history/                    Sales history with expandable details, table filters, & reprint
      (app)/reports/                    Counter-sale reports (revenue, tickets, hourly, best sellers)
      (app)/menu/                       Category & dish management
      (print)/receipt/[saleId]/         Printable thermal receipt view for single sale
      (print)/table-receipt/[tableId]/  Printable consolidated thermal table receipt for full table bill
  modules/admin/
    auth/                               session, login helpers, requireStaff/requireManager
    sales/                              actions (createSale, settleTableBill), queries (getLiveTablesStatus, getTableConsolidatedBill, getSalesHistory)
    menu/                               menu CRUD actions
    tables/                             dining table CRUD actions (createTable, updateTable, toggleTableActive, deleteTable)
    reports/                            reporting queries
    audit/                              audit log
    components/                         AdminShell, nav-items, ActionForm, Popover, realtime-refresh
    lib/                                action-result helpers (guarded, actor, managerActor)
  modules/public/                       public-only UI (hero, ocean, header/footer)
  shared/                               supabase, database.ts, lib, ui, config
```

Keep: every server action returns `ActionResult` via `guarded()`; forms use `<ActionForm>`; confirmations live in `<Popover>`; report state lives in the URL.
