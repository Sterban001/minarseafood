# MINAR SEA FOOD

Counter POS register, dining table billing system, and public website for **Minar Sea Food** (Charminar, Hyderabad).

> **Documentation:**  
> - [`PROJECT.md`](PROJECT.md) — Product requirements, operational workflows, and route map.  
> - [`HANDOVER.md`](HANDOVER.md) — Database schema, migration order, invariants, and gotchas.

---

## Key Features

1. **Manual Business Day Sessions**: Manager opens and closes trading sessions via header controls. Prevents off-hours punches; binds daily resetting sale numbers (`#1`, `#2`, ...) to the active session.
2. **Quick Sale POS Till (`/admin`)**: Fast touch grid with permanent `<` and `>` arrow buttons, mouse-wheel horizontal scrolling, and dish variant clustering (Single/Full, 1pc/2pc cards). One-click direct DOM thermal printing on charge.
3. **Dining Table & Takeaway Billing (`/admin/tables`)**: Mandatory order type selector (Takeaway 1..5 vs Dine-in Table). Active tables highlight `🟢 LIVE` with accumulated totals. Consolidated session bill printing (`/admin/table-receipt/[id]`) and instant settlement.
4. **Expenses & Daily Salaries (`/admin/expenses`)**: Track staff daily wages, itemized kitchen supply purchases (`qty * unit_price`), and petty cash. Live net cashflow balance (`Day Sales - Total Expenses`).
5. **Sales History & Financial Reports (`/admin/history`, `/admin/reports`)**: Searchable sales log, bill reprints, and financial P&L analysis (Revenue, Expenses, Net Margin %, hourly sales, best-selling dishes).
6. **Menu Management (`/admin/menu`)**: Dishes and category CRUD with availability toggles and safe dish deletion (preserves historical sale receipts and revenue records).
7. **Public Website (`/`, `/menu`, `/contact`)**: Fast, mobile-first design with night-kitchen aesthetics, live database menu, Google Maps pin, and WhatsApp ordering link. (No admin links).

---

## Quick Start

```bash
npm run dev        # Starts local development server on http://localhost:3000
npm run build      # Production build check
npm run typecheck  # TypeScript validation
```

- **Production:** https://minarseafood.com  
- **Staff Till:** https://minarseafood.com/admin/login  
