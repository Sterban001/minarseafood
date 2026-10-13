# MINAR SEA FOOD — Engineering Handover & Traps

Read `PROJECT.md` first for product scope and workflows. This file documents internals, invariants, and production traps.

---

## Next.js 16 & React Gotchas

1. **Proxy Middleware**: Handled in `src/proxy.ts` exporting `proxy()` (Node runtime, not `middleware.ts`).
2. **Server Actions in JSX**: Never use inline dynamic import closures (`<form action={async () => { "use server"; await import(...) }}>`). Turbopack / Next.js 16 fails action serialization. Always export top-level actions from `@/modules/.../actions.ts` (e.g. `settleTableBillAction`).
3. **React Hook Order Invariant (React Error #300)**: All hooks (`useState`, `useMemo`, `useEffect`, `useTransition`) must be called unconditionally at the very top of components before any early returns (e.g., POS success receipt view in `QuickSaleView`).
4. **Print Error Boundaries**: Print pages live in `(print)`. Use `src/app/(admin)/admin/(print)/error.tsx` to prevent Next.js from rendering root 500 error screens on receipt edge-cases.
5. **Postgres UUID Validation**: Validate `tableId` and `saleId` against standard UUID regex before querying Supabase to avoid unhandled Postgres `22P02` syntax exceptions.

---

## Database Migrations (`supabase/migrations/`)

| # | Migration File | Scope |
|---|---|---|
| 1 | `20260918120000_schema.sql` | Core tables (`profiles`, `menu_categories`, `menu_items`, `audit_log`) & RLS |
| 2 | `20260918120100_policies.sql` | Security policies and role enforcement |
| 3 | `20260930_counter_sale.sql` | Counter till `sales`, `sale_items`, resetting `sale_no`, & calculation triggers |
| 4 | `20261002_sale_table_link.sql` | Adds `sales.table_id` FK linking sales to `dining_tables` |
| 5 | `20261002_sale_table_billed_at.sql` | Adds `sales.table_billed_at` timestamp for table session settlement |
| 6 | `20261005_manual_business_day.sql` | `business_days` table, partial unique active index, & session validation |
| 7 | `20261006_expenses.sql` | `expenses` table, calculation triggers, & `v_daily_expenses_summary` view |
| 8 | `20261010_takeaway_tables.sql` | Seeds Takeaway slots 1..5 in `dining_tables` for takeaway consolidated billing |
| 9 | `20261010_speed_indexes.sql` | Indexes on `sales(business_date)`, `sale_items(sale_id)`, & `sales(business_date, table_id)` |
| 10 | `20261013_menu_items_on_delete_set_null.sql` | Sets `ON DELETE SET NULL` on `sale_items.menu_item_id` foreign key |

---

## Critical Database Invariants (Must Not Break)

1. **Client Money Never Trusted**: Browser sends `{menuItemId, qty}`. `line_total` is generated (`qty * item_price`). `trg_recalc_sale_total` computes `subtotal` and `total` on write.
2. **Itemized Expense Math**: `trg_calc_expense_item_amount` forces `amount = ROUND(quantity * unit_price, 2)`.
3. **Single Active Business Day**: Partial unique index `idx_business_days_single_active` enforces `ended_at IS NULL` uniqueness. `assign_sale_no()` blocks writes when no day is open.
4. **Daily Resetting Sale Numbers**: `sale_no` restarts per business date under advisory transaction lock (`trg_assign_sale_no`, `SECURITY DEFINER`).
5. **Live Table & Takeaway State**: Slot is `🟢 LIVE` if sales exist where `business_date = activeDay AND table_id = table.id AND table_billed_at IS NULL`. Settlement sets `table_billed_at = NOW()`.
6. **Historical Data Integrity on Dish Deletion**: `sale_items` preserves snapshotted `item_name` and `item_price`. Foreign key `menu_item_id` sets to `NULL` on deletion, so past sales and revenue reports remain 100% accurate.

---

## Key App Operations

| Function | File | Description |
|---|---|---|
| `startDay(date?)` | `sales/actions.ts` | Starts or reopens business day session |
| `endDay()` | `sales/actions.ts` | Closes active business day (`ended_at = NOW()`) |
| `getActiveBusinessDay()` | `sales/queries.ts` | Memoized fetch for currently open day |
| `createSale(cart, tableId)` | `sales/actions.ts` | Inserts sale header & items under active business date |
| `settleTableBill(tableId)` | `sales/actions.ts` | Sets `table_billed_at = NOW()` to clear table session |
| `settleTableBillAction(formData)` | `sales/actions.ts` | Form Action adapter for Next.js form submits |
| `getTableConsolidatedBill(tableId)` | `sales/queries.ts` | Aggregates all unbilled session items into one bill |
| `clusterMenuItems(items)` | `sales/components/quick-sale-view.tsx` | Groups Single/Full and 1pc/2pc variants into compact dish cards |
| `deleteMenuItem(id)` | `menu/actions.ts` | Detaches sale item foreign keys and deletes menu dish |
| `deleteSale(saleId)` | `sales/actions.ts` | Voids sale and its items, refreshing history and totals |
| `getDailyExpensesData()` | `expenses/queries.ts` | Fetches salaries, itemized expenses, misc expenses, & net margin |

---

## Auth & Security Rules

- Google OAuth for owner (`super_admin`); Email + password for staff (`createStaff` via service role).
- Email provider **ON**, Public signup **OFF**. Staff redirect destination: `/admin`.
- Google redirect URI configured in Supabase: `https://hoxifrmqlrjdloyeaaed.supabase.co/auth/v1/callback`.
- `src/proxy.ts` allows `/admin/auth/*` and static assets through without session.
- Redirect non-staff to `/admin/no-access` instead of throwing `forbidden()`.
