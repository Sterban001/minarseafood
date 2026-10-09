# MINAR SEA FOOD — project brief

**Start here.** Next.js 16 rules in `AGENTS.md`. Database traps & internals in `HANDOVER.md`.

Last updated: 06 Oct 2026 (Expenses & Salaries Tracking, Financial P&L Reports).

---

## What this is

One Next.js app, two isolated halves sharing only Supabase client and types:

- **Public Site** (`/`, `/menu`, `/contact`): Anonymous menu, 5m revalidation, night-kitchen visual theme (ocean waves, silhouettes, Playfair Display). No login links.
- **Staff Till / Admin** (`/admin/**`): Counter POS & table billing register. Manual day sessions, quick sale menu grid, mandatory takeaway/table selector, live green table monitor, consolidated bills, printable thermal receipts, sales history, daily reports, dining tables CRUD, menu management.

---

## Current State

| Area | State |
| --- | --- |
| Public site | Live menu from DB, night-kitchen theme, no login links. Hours: 1:00 PM – 12:00 AM daily. |
| Restaurant details | Panje Shah Road, Charminar, Hyderabad 500002; phone `+91 63050 02792`; no public email. |
| Manual Business Day | **Implemented 05 Oct 2026** — Manual Start Day / End Day session controls via header `<DayControls>`. Sales blocked when closed. Resetting sale numbers (`#1`, `#2`) tied to active day. |
| Menu & Items | **Overhauled 05 Oct 2026** — 8 official categories, 27 dishes seeded from physical menu card (Starters/Dry, Gravies/Wet, Rotis, Fish Thali, Mandi, Extras, Ready-To-Fry, Beverages). |
| POS Category Scroller | Fixed Left (`<`) / Right (`>`) arrows, mouse-wheel horizontal scrolling, touch drag. |
| Counter & Table/Takeaway Billing | Mandatory Takeaway vs Table selector. Live green tables & takeaways (`🟢 LIVE`), consolidated bills (`/admin/table-receipt/[tableId]`, `/admin/takeaway-receipt/[tableId]`), instant settlement. |
| Expenses Management | **Implemented 06 Oct 2026** — 3 tabs: Daily Salaries Total, Itemized Daily Expenses (`qty * unit_price`), and Others (Miscellaneous). Real-time profit/burn cash balance against daily sales revenue. |
| Financial Reports & P&L | **Updated 06 Oct 2026** — Consolidated Profit & Loss, Net Margin %, Day-by-Day Revenue vs Expenses curve, best-selling dishes, and top expense categories across custom date ranges. |
| Database Migrations | 8 migrations in `supabase/migrations/` (schema, policies, counter sales, table link, table billed at, manual business days, expenses, takeaway tables). |
| Auth | Google OAuth (owner/super_admin) + Email/password (staff). Public signup off. All staff land on `/admin`. |
| Deploy | Production on Vercel at `https://minarseafood.com`. |

---

## Operational Workflow

1. **Business Day Session**:
   - Staff click **Start Day** in the header (or sale banner) before taking orders. Pick or confirm business date.
   - All sales, receipts, and reports attach to this active session.
   - At close, staff click **End Day** to seal the session. Prevents accidental off-hours sales. Reopening supported.
2. **Item-by-Item Cash Collection**:
   - Waiters collect cash per dish and pay the cashier.
   - Cashier punches item(s) in Quick Sale (`/admin`).
3. **Mandatory Order Type**:
   - Must select **🛍️ Takeaway** (slot Takeaway 1..5) or **🍽️ Table Number** (e.g. T1, T2) before charging.
   - Minted sale number resets daily (`#1`, `#2`, ...). One-click auto-print thermal receipt.
4. **Live Green Table & Takeaway Indicators (`🟢 LIVE`)**:
   - Tables and takeaway slots with active unbilled sales turn **GREEN** on `/admin/tables` and Quick Sale drawer with unbilled total & order count.
5. **Consolidated Table & Takeaway Bills & Settlement**:
   - Cashier opens `/admin/table-receipt/[id]` (or `/admin/takeaway-receipt/[id]`) to print all session items on one consolidated bill.
   - For takeaway bills, clearly specifies order type as Takeaway.
   - Clicking **Mark Settled** sets `table_billed_at = NOW()`, clearing the table or takeaway slot back to `⚪ Available`.
6. **Daily Expenses & Salaries Tracking**:
   - Cashier/manager logs daily staff wage payouts (Daily Salaries tab).
   - Cashier logs raw material supply purchases with item, quantity, and unit price (Daily Expenses tab).
   - Miscellaneous petty cash, auto transport, and maintenance logged in Others tab.
   - System computes real-time daily Net Cash Balance (`Day Sales - Total Day Expenses`).

---

## Routes

```
/                             Home (hero, ocean wave, hours, map)
/menu                         Public menu (category pills, search, filter)
/contact                      Location, contact, directions
/admin/login                  Staff authentication (Google & password)
/admin/auth/callback          OAuth code exchange (ungated)
/admin/no-access              Permission denied
/admin                        Quick Sale POS (menu grid, cart, order type, charge)
/admin/expenses               Expenses & Salaries (Salaries, Itemized Qty*Price, Misc Others)
/admin/tables                 Dining tables CRUD & live green table monitor
/admin/history                Sales history log (table filters, expandable details, reprint, delete bill)
/admin/reports                Financial P&L, revenue, expenses, net profit, top items & expense categories
/admin/menu                   Category & dish CRUD + availability toggles
/admin/receipt/[saleId]       Printable thermal receipt (single sale)
/admin/table-receipt/[tableId] Printable consolidated thermal receipt (full table bill)
/admin/daily-report           Printable daily & period financial audit report (expenses canceled from total sales)
```

---

## Menu Categories (8)

1. **Starters / Dry** (5 items: Pepper Fish, Broasted Fish, Prawns Fry, Chicken 65, Minar Combo)
2. **Gravies / Wet** (5 items: Butter Malai Fish, Apollo Fish, Fish Masala, Prawns Masala, Chicken Masala)
3. **Rotis & Bread** (2 items: Rumali Roti, Paratha)
4. **Fish Thali** (1 item: Fish Thali ₹99)
5. **Mandi** (5 items: Fish Mandi 1pc/2pc, Fish Juicy Mandi 1pc/2pc, Minar Mandi Platter)
6. **Extras** (4 items: Mandi Rice, Fish Mandi Extra Piece, Fish Juicy Extra Piece, Mayonise)
7. **Ready To Fry (Take Away)** (3 items: Pepper Fish /KG, Broasted Fish /KG, Prawns /KG)
8. **Beverages** (4 items: Water Bottle Small ₹10, Big ₹20, Glass Cool Drink ₹15, Plastic Bottle ₹20)
