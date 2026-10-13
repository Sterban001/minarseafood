# MINAR SEA FOOD — Project Brief

Next.js 16 rules in `AGENTS.md`. Database traps & internals in `HANDOVER.md`.  
**Last updated:** 13 Oct 2026 (Dish Variant Clubbing, Safe Menu Deletion, Print Architecture).

---

## Architecture Overview

Single Next.js app with two strictly isolated halves sharing Supabase client and types:

- **Public Site (`/`, `/menu`, `/contact`)**: Read-only anonymous menu, 5m ISR revalidation, night-kitchen visual theme (ocean waves, silhouettes, Playfair Display). Hours: 1:00 PM – 12:00 AM daily. No login links.
- **Staff Till / Admin (`/admin/**`)**: Counter POS & table billing register. Manual business day sessions, quick-sale menu grid with dish variant clustering, live green table/takeaway monitor, consolidated bills, direct thermal printing, sales history, daily reports, expense/salary ledger, and menu CRUD.

**Restaurant Info**: Panje Shah Road, Charminar, Hyderabad 500002; Phone: `+91 63050 02792`.

---

## Current System State

| Domain | Implementation Status |
| --- | --- |
| **Manual Business Day** | Session control via header `<DayControls>`. Sales blocked when closed. Resetting sale numbers (`#1`, `#2`) tied to active business date under advisory lock. |
| **Menu & Variant Clubbing** | 8 categories, 27 physical menu items. Dishes with portions (Single/Full, 1pc/2pc, /KG) auto-cluster into single cards with variant pill selectors on POS grid. |
| **Safe Dish Deletion** | Deleting a dish sets `sale_items.menu_item_id = null` (`ON DELETE SET NULL`), preserving historical receipt items, names, prices, and revenue reports. |
| **Counter & Table/Takeaway POS** | Mandatory order type (🛍️ Takeaway slot 1..5 vs 🍽️ Dine-in Table). Instant direct-DOM thermal receipt on charge. Live green indicators (`🟢 LIVE`) with unbilled totals. |
| **Consolidated Bills** | Full session bills for tables & takeaways (`/admin/table-receipt/[id]`). Settle clears session (`table_billed_at = NOW()`), returning slot to `⚪ Available`. |
| **Expenses & Salaries** | 3 tabs: Daily Salaries, Itemized Expenses (`qty * unit_price`), and Others (Petty Cash). Real-time daily Net Balance (`Sales - Total Expenses`). |
| **Financial Reports & P&L** | Consolidated P&L, Net Margin %, Day-by-Day Revenue vs Expenses curve, hourly sales, top dishes, and expense category breakdown. |
| **Database Migrations** | 10 migrations in `supabase/migrations/` (schema, policies, counter sales, table links, sessions, expenses, takeaway slots, speed indexes, safe FK deletion). |
| **Auth & Access** | Google OAuth (super_admin) + Email/password (staff). Public signup disabled. All staff route to `/admin`. |
| **Production** | Hosted on Vercel at `https://minarseafood.com`. |

---

## Operational Workflow

1. **Business Day Session**: Manager clicks **Start Day** before taking orders. Day can be reopened if closed prematurely. Orders cannot be created if day is closed.
2. **Punching & Variant Selection**: Cashier selects items on Quick Sale (`/admin`). Portion variants (Single/Full, 1pc/2pc) are selected directly within unified dish cards.
3. **Order Type & Immediate Thermal Print**: Mandatory Takeaway or Table selection. Clicking **Charge** saves the sale, emits auto-incrementing daily sale `#`, and triggers instant receipt print.
4. **Live Table Floor (`🟢 LIVE`)**: Active unbilled orders highlight tables and takeaway slots green in real time with accumulated live totals.
5. **Consolidated Table Settlement**: Cashier opens `/admin/table-receipt/[tableId]` to print complete aggregated bill, then clicks **Mark Settled** to release the table.
6. **Expense & Salary Ledger**: Log staff daily wages, itemized kitchen supplies, and misc cash payouts. Dashboard monitors live profit and cash burn against revenue.

---

## Route Map

```
/                             Home (hero, ocean wave, hours, map)
/menu                         Public menu (category pills, search, filter)
/contact                      Location, hours, directions
/admin/login                  Staff authentication (Google & password)
/admin/auth/callback          OAuth code exchange (ungated)
/admin/no-access              Permission denied screen
/admin                        Quick Sale POS (menu grid, variant cards, cart, charge)
/admin/expenses               Expenses & Salaries (Salaries, Itemized Qty*Price, Misc Others)
/admin/tables                 Dining tables CRUD & live green floor monitor
/admin/history                Sales history log (table filters, expandable details, reprint, delete)
/admin/reports                Financial P&L, revenue, expenses, net profit, top items & categories
/admin/menu                   Category & dish CRUD + availability toggles + safe dish deletion
/admin/receipt/[saleId]       Thermal printable receipt (single sale reprint)
/admin/table-receipt/[tableId] Consolidated thermal printable bill (table or takeaway session)
/admin/takeaway-receipt/[tableId] Alias redirect to table-receipt
/admin/daily-report           Printable daily & period financial audit report
```

---

## Official Menu Categories (8)

1. **Starters / Dry**: Pepper Fish, Broasted Fish, Prawns Fry, Chicken 65, Minar Combo
2. **Gravies / Wet**: Butter Malai Fish, Apollo Fish, Fish Masala, Prawns Masala, Chicken Masala
3. **Rotis & Bread**: Rumali Roti, Paratha
4. **Fish Thali**: Fish Thali (₹99)
5. **Mandi**: Fish Mandi (1pc/2pc), Fish Juicy Mandi (1pc/2pc), Minar Mandi Platter
6. **Extras**: Mandi Rice, Fish Mandi Extra Piece, Fish Juicy Extra Piece, Mayonise
7. **Ready To Fry (Take Away)**: Pepper Fish /KG, Broasted Fish /KG, Prawns /KG
8. **Beverages**: Water Bottle (Small ₹10 / Big ₹20), Cool Drinks (Glass ₹15 / Plastic ₹20)
