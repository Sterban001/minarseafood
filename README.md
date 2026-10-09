# MINAR SEA FOOD

Counter-sale POS register, dining table billing system, and public website for **Minar Sea Food** (Charminar, Hyderabad).

> **Documentation:**  
> - [`PROJECT.md`](PROJECT.md) — Product requirements, operational workflows, and architecture.  
> - [`HANDOVER.md`](HANDOVER.md) — Database schema, migration order, invariants, and gotchas.

---

## 🌟 Key Features

### 1. Manual Business Day Sessions
- **Start / End Day Controls**: Header controls allow managers to manually open and close the store trading day.
- **Strict Sale Protection**: Prevents off-hours punches; binds daily resetting sale numbers (`#1`, `#2`, ...) to the active session.

### 2. Quick Sale POS Till (`/admin`)
- **Fast Touch Grid**: Categories with permanent `<` and `>` arrow buttons, mouse-wheel horizontal scrolling, and touch drag.
- **Mandatory Order Type**: Select **Takeaway** or **Table Number** before charging cash.
- **Instant Receipt Printing**: One-click thermal receipt popup upon charging.

### 3. Dining Table & Takeaway Billing & Live Monitoring (`/admin/tables`)
- **Live Green Tables & Takeaways (`🟢 LIVE`)**: Tables and takeaway order slots with open unbilled orders turn green across the app with live unbilled totals.
- **Consolidated Table & Takeaway Bills**: Prints a single aggregated customer bill grouping all item orders from the session (`/admin/table-receipt/[tableId]`, `/admin/takeaway-receipt/[tableId]`), with an explicit Takeaway designation line for parcel orders.
- **One-Click Settlement**: Settles the session (`table_billed_at = NOW()`), resetting table or takeaway slot to available (`⚪ Available`).

### 4. Sales History & Financial Reports
- **Sales History (`/admin/history`)**: Filter by date and table, expandable item breakdown, and instant reprint.
- **Daily Reports (`/admin/reports`)**: Financial P&L summary cards (Gross Revenue, Total Expenses, Net Margin %), Day-by-Day Revenue vs Expenses curves, hourly sales distribution, best-selling dishes, and top expense categories.

### 5. Expenses & Daily Salaries (`/admin/expenses`)
- **Daily Salaries**: Record staff wages with quick role presets and compute daily salaries total.
- **Daily Expenses (Itemized)**: Add kitchen and supply items by quantity and unit price with real-time cost calculation.
- **Others (Miscellaneous)**: Record utility bills, auto transport, repairs, and petty cash.
- **Net Cashflow Indicator**: Live daily balance calculating `Day Sales Revenue - Total Expenses`.

### 6. Public Website (`/`, `/menu`, `/contact`)
- Fast, mobile-first design with night-kitchen aesthetics, live database menu, Google Maps pin, and WhatsApp ordering link. (No admin links).

---

## 🚀 Quick Start

```bash
npm run dev        # Starts local development server on http://localhost:3000
npm run build      # Production build check
npm run typecheck  # TypeScript validation
```

- **Production:** https://minarseafood.com  
- **Staff Till:** https://minarseafood.com/admin/login  
