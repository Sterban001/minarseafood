# MINAR SEA FOOD — project brief

**Start here.** Then `AGENTS.md` (Next.js 16 rules). `HANDOVER.md` is traps and
internals only — do not duplicate this file there.

Last updated: 30 Sep 2026 (Counter sales overhaul).

Do **not** wipe sales or add gallery photos unless asked. Do **not**
re-seed or overwrite dishes. Public copy must not invent amenities. Public UI
must not mention or link to `/admin`.

**Next chat: this file, `AGENTS.md`, then [What is left](#what-is-left).**

---

## What this is

One Next.js app, two halves that share only the Supabase client and types:

- **Public site** (`/`, `/menu`, `/contact`) — anonymous
  menu, 5-minute revalidation. No login, no signup, no staff link.
- **Counter Till / Admin** (`/admin/**`) — typed as `/admin/login`. Streamlined counter-sale cash register for the owner (Quick Sale menu grid, sale receipts, history log, simplified reports, menu management).

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
| Counter Till | **Overhauled 30 Sep 2026** — Simplified cash register model. Quick Sale main page (`/admin`) with category pills & menu grid, daily sale numbering (`#1`, `#2` resetting at 5am), printable thermal receipts, expandable date-filtered sales history (`/admin/history`), and streamlined counter reports (`/admin/reports`). |
| Schema, RLS, triggers, views | Applied by hand in the SQL editor (`20260930_counter_sale.sql`). |
| Menu and items | As the owner wants them. |
| Auth | Google (owner) works. Email+password works. **Public signup off — must stay off.** All staff land on `/admin` (Quick Sale). |
| Owner | `super_admin`. |
| Service-role key | Set in `.env.local` **and** in Vercel environment variables (Production only). |
| Deploy | **Live** at `https://minarseafood.com` (Vercel). Supabase Auth → URL Configuration: Site URL and redirect URLs set to the production domain. Google OAuth redirect URI points at Supabase's callback, not the app directly. |
| Sales wipe / gallery photos | **Parked.** |

---

## Live Supabase

- **Ref:** `hoxifrmqlrjdloyeaaed` — `https://hoxifrmqlrjdloyeaaed.supabase.co`
- Applied in the dashboard SQL editor, filename order:
  `20260918120000_schema.sql`, `20260918120100_policies.sql`,
  `20260918120200_floor_snapshot.sql`, `20260930_counter_sale.sql`, then `seed.sql`.
- **No Supabase CLI and no Docker on this machine.** `npm run db:push` /
  `db:reset` do not work. Paste new SQL into the editor. Migration files are
  written to be re-runnable (`create or replace`, `if not exists`,
  `drop policy if exists`) because there is no migration history table.

`.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only;
never `NEXT_PUBLIC_`; never import `src/shared/supabase/admin.ts` from a
Client Component).

---

## Stack and commands

Next.js **16.3.5**, App Router, Turbopack, React 19.2, TypeScript strict,
Tailwind v4 (`@theme` in `src/app/globals.css`). Middleware is `src/proxy.ts`
exporting `proxy()`. `cookies()`, `params`, `searchParams` are async. After
adding a route run `npx next typegen`. `next lint` is gone. Read
`node_modules/next/dist/docs/` — see `AGENTS.md`.

```bash
npm run dev          # localhost:3000
npm run build
npm run typecheck
npm run lint
npm run check:sql    # real PG grammar over supabase/**/*.sql
```

---

## Routes

```
/  /menu  /contact
/admin/login               Google + email/password — not linked from the public site
/admin/auth/callback       OAuth code exchange, ungated on purpose
/admin/no-access
/admin                     Quick Sale cash-register screen (menu grid + cart + charge)
/admin/history             Sales history log with expandable details & reprint links
/admin/reports             Counter-sale reports (revenue, tickets, hourly, best sellers)
/admin/menu                Menu category & dish management
/admin/receipt/[saleId]    Printable thermal receipt page
```

`src/app/` = routes, `src/modules/` = features, `src/shared/` = clients, types,
UI. Annotated tree is in `HANDOVER.md`.

Public chrome lives in `src/modules/public/components/` (hero, ocean scene,
page heroes, header/footer). Contact also exposes WhatsApp via `whatsappHref`
in `restaurant.ts`. **No public email.**

---

## Navigation & Workflow

The counter-sale till features 4 core navigation items:
1. **Sale** (`/admin`): Category pills, item grid, cart sidebar, instant cash charge.
2. **History** (`/admin/history`): Date-filtered sales log with items & reprint actions.
3. **Reports** (`/admin/reports`): Revenue totals, daily chart, sales by hour, best seller list.
4. **Menu** (`/admin/menu`): Category and dish CRUD & availability toggles.

---

## What is left

1. **Walk RLS as the waiter** if not already done: cannot open another waiter's
   order, cannot void or discount, cannot reach `/admin/menu`, `/staff`,
   `/reports`, `/audit`; floor still shows everyone else's occupancy.

Public UI overhaul is **done**. Further visual tweaks only if asked. Do not
invent amenities, add gallery files, or restyle `/admin` to match the public
site.

**Parked — do not start:**

- Wipe sales. When asked, a short SQL script that leaves menu and tables — no
  invented `truncate`.
- Gallery photos. `src/shared/config/gallery.ts` has no `src`. Files go in
  `public/gallery/`.

---

## Decisions

- Google for the owner, issued passwords for staff. Shared tablets must not
  carry a personal Google session.
- A numeric PIN per waiter is the long-term floor login. Parked.
- No chart library. Public site never advertises `/admin`.
- Public visual language is night-kitchen (ink, foam, Playfair Display titles, Plus Jakarta Sans body, frosted glass capsules, multi-layered ocean waves & wiggling seafood silhouettes).
  Admin stays the original POS chrome — do not unify the two.

`AGENTS.md` / `CLAUDE.md` are written by `next dev`. Leave them alone. Git
history is still mostly the `create-next-app` scaffold.
