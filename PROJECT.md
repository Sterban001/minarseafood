# MINAR SEA FOOD — project brief

**Start here.** Then `AGENTS.md` (Next.js 16 rules). `HANDOVER.md` is traps and
internals only — do not duplicate this file there.

Last updated: 05 Oct 2026 (Tables, Live Green Status & Consolidated Bill — committed & pushed).

Do **not** wipe sales or add gallery photos unless asked. Do **not**
re-seed or overwrite dishes. Public copy must not invent amenities. Public UI
must not mention or link to `/admin`.

**Next chat: this file, `AGENTS.md`, then [What is left](#what-is-left).**

---

## What this is

One Next.js app, two halves that share only the Supabase client and types:

- **Public site** (`/`, `/menu`, `/contact`) — anonymous
  menu, 5-minute revalidation. No login, no signup, no staff link.
- **Counter Till / Admin** (`/admin/**`) — typed as `/admin/login`. Streamlined counter-sale & dining table cash register for the restaurant (Quick Sale menu grid, mandatory table/takeaway selector, live green table monitor, printable thermal receipts, consolidated table bills, expandable date-filtered sales history, simplified reports, dining tables CRUD, menu management).

Money is computed in Postgres. Old sales keep their own names and prices.
Privileged actions are written to `audit_log` by triggers the app cannot skip.

---

## Current state

| Area | State |
| --- | --- |
| Public site | **Streamlined & Overhauled 21 Sep 2026** — 3 core pages (`/`, `/menu`, `/contact`). Interactive `<MenuView />` with sticky category pill bar, dish counts, Grid/List view switcher, and featured flame badges. Night-kitchen theme with Playfair Display & Plus Jakarta Sans typography, bioluminescent ocean waves, and submerged animated seafood silhouettes. Live menu from DB. Logo at `public/logo.png`. |
| Restaurant details | **Filled** in `src/shared/config/restaurant.ts`: Panje Shah Road, Charminar, Hyderabad 500002; phone `+91 63050 02792`; maps pin `https://maps.app.goo.gl/87xdqy1aG9HxvNs87`. **No public email.** Hours: **1:00 PM - 12:00 AM every day.** |
| Public copy | Honest: fish and prawns, cooked to order. **No** crabs, rooftop, family rooms, AC hall, tandoor/coast mythology. |
| Public → admin | **No link.** Staff type `/admin/login`. |
| Counter Till & Table Billing | **Overhauled 02 Oct 2026** — Supports counter cash sales & table billing workflow. Mandatory choice between Takeaway and Table Number on every sale. Live green table monitoring (`🟢 LIVE`), consolidated table bills (`/admin/table-receipt/[tableId]`), and session settlement. |
| Schema, RLS, triggers, views | Applied by hand in SQL editor (`20260930_counter_sale.sql`, `20261002_sale_table_link.sql`, `20261002_sale_table_billed_at.sql`). |
| Menu and items | As the owner wants them. |
| Auth | Google (owner) works. Email+password works. **Public signup off — must stay off.** All staff land on `/admin` (Quick Sale). |
| Owner | `super_admin`. |
| Service-role key | Set in `.env.local` **and** in Vercel environment variables (Production only). |
| Deploy | **Live** at `https://minarseafood.com` (Vercel). Supabase Auth → URL Configuration: Site URL and redirect URLs set to the production domain. Google OAuth redirect URI points at Supabase's callback, not the app directly. |

---

## Counter & Dining Table Operational Workflow

Minar Seafood operates under a specific cashier-waiter workflow:

1. **Item-by-Item Cash Collection**:
   - Waiters collect cash from their own float for each dish/item ordered and bring it to the cashier counter.
   - Cashier punches the dish in the Quick Sale till (`/admin`).
2. **Mandatory Order Type Selection**:
   - Cashier MUST choose either **🛍️ Takeaway** or **🍽️ Table Number** (e.g., T1, T2) before charging.
   - Each purchase mints a daily-resetting receipt number (`#1`, `#2`, resetting at 5am).
3. **Live Green Table Indicator (`🟢 LIVE`)**:
   - As long as a table has active, unbilled sales for the current customer session, it turns **vibrant GREEN (`🟢 LIVE`)** on the Tables page (`/admin/tables`) and Quick Sale table picker grid.
   - Shows live unbilled total and order count (e.g., `Unbilled: ₹850 (3 orders)`).
4. **Consolidated Table Bill & Table Settlement**:
   - At the end of the customer's meal, cashier opens `/admin/table-receipt/[tableId]` (or clicks **`Print & Settle Table`**).
   - Aggregates all separate item purchases for that table session into **one clean consolidated customer bill** (with grouped items, rates, line totals, and grand total).
   - Clicking **`Print & Settle Table`** or **`Mark Settled`** sets `sales.table_billed_at = NOW()`, clearing the green status (`⚪ Available`) ready for the next customer session.

---

## Routes

```
/  /menu  /contact
/admin/login                     Google + email/password — not linked from the public site
/admin/auth/callback             OAuth code exchange, ungated on purpose
/admin/no-access
/admin                           Quick Sale cash-register screen (menu grid + cart + mandatory table/takeaway selector + charge)
/admin/tables                    Dining tables management & live green table monitor (🟢 LIVE status + Print & Settle actions)
/admin/history                   Sales history log with expandable details, table filters, & reprint links
/admin/reports                   Counter-sale reports (revenue, tickets, hourly, best sellers)
/admin/menu                      Menu category & dish management
/admin/receipt/[saleId]          Printable thermal receipt page for single sale
/admin/table-receipt/[tableId]   Printable consolidated thermal table receipt for full customer session
```

---

## Navigation & Workflow

The admin till features 5 core navigation items:
1. **Sale** (`/admin`): Category pills, item grid, cart sidebar, mandatory takeaway/table selector, instant cash charge.
2. **Tables** (`/admin/tables`): Live green table monitor (`🟢 LIVE`), table billing status, add/edit/hide tables, Print & Settle table bill.
3. **History** (`/admin/history`): Date-filtered sales log with table search filter, item details, single receipt reprint & consolidated table bill reprint.
4. **Reports** (`/admin/reports`): Revenue totals, daily chart, sales by hour, best seller list.
5. **Menu** (`/admin/menu`): Category and dish CRUD & availability toggles.

---

## Decisions

- Google for the owner, issued passwords for staff. Shared tablets must not carry a personal Google session.
- No chart library. Public site never advertises `/admin`.
- Public visual language is night-kitchen (ink, foam, Playfair Display titles, Plus Jakarta Sans body, frosted glass capsules, multi-layered ocean waves & wiggling seafood silhouettes). Admin stays the clean POS chrome.
