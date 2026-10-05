# MINAR SEA FOOD

Counter-sale till, dining table billing system, and public site for **Minar Sea Food** (Charminar, Hyderabad).

> **Important Docs:** Read [`PROJECT.md`](PROJECT.md) for full project brief & workflow. Read [`HANDOVER.md`](HANDOVER.md) for database & engineering traps.

---

## 🌟 Key Features

1. **Public Site** (`/`, `/menu`, `/contact`):
   - Fast, mobile-responsive menu, cooking philosophy, restaurant details, map directions, and WhatsApp ordering link. No login link on public site.

2. **Counter Till & Table Billing System** (`/admin`):
   - **Quick Sale Till**: Touch-friendly menu grid with category pills, cart sidebar, and cash charging.
   - **Mandatory Order Type Selector**: Cashier MUST pick either **🛍️ Takeaway** or **🍽️ Table Number** before charging each item sale.
   - **Live Green Tables (`🟢 LIVE`)**: Active tables with open orders turn **GREEN** across the app with live unbilled totals.
   - **Consolidated Table Bill**: Print a single aggregated receipt for a table session (`/admin/table-receipt/[tableId]`).
   - **Table Settlement**: Printing or settling a table bill clears the table back to standard available state (`⚪ Available`).
   - **Sales History**: Expandable sales log with table search filter and single receipt reprint.

---

## 🚀 Quick Start

```bash
npm run dev        # Starts dev server on http://localhost:3000
npm run build      # Verifies production build & TypeScript types
```

- **Live site:** https://minarseafood.com
- **Staff Till:** https://minarseafood.com/admin/login
