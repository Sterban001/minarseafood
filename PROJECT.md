# MINAR SEA FOOD — project brief

**Start here.** Then `AGENTS.md` (Next.js 16 rules). `HANDOVER.md` is traps and
internals only — do not duplicate this file there.

Last updated: 21 Sep 2026.

Do **not** wipe sales, add gallery photos, or deploy unless asked. Do **not**
re-seed or overwrite dishes. Public copy must not invent amenities. Public UI
must not mention or link to `/admin`.

**Next chat: this file, `AGENTS.md`, then [What is left](#what-is-left).**

---

## What this is

One Next.js app, two halves that share only the Supabase client and types:

- **Public site** (`/`, `/menu`, `/contact`) — anonymous
  menu, 5-minute revalidation. No login, no signup, no staff link.
- **Staff POS** (`/admin/**`) — typed as `/admin/login`. Table orders, waiter
  logins, manager tools, owner reports, audit trail.

Money is computed in Postgres. Old bills keep their own names and prices.
Privileged actions are written to `audit_log` by triggers the app cannot skip.

---

## Current state

| Area | State |
| --- | --- |
| Public site | **Streamlined & Overhauled 21 Sep 2026** — 3 core pages (`/`, `/menu`, `/contact`). Interactive `<MenuView />` with sticky category pill bar, dish counts, Grid/List view switcher, and featured flame badges. Night-kitchen theme with Playfair Display & Plus Jakarta Sans typography, bioluminescent ocean waves, and submerged animated seafood silhouettes. Live menu from DB. Logo at `public/logo.png`. |
| Restaurant details | **Filled** in `src/shared/config/restaurant.ts`: Panje Shah Road, Charminar, Hyderabad 500002; phone `+91 63050 02792`; maps pin `https://maps.app.goo.gl/87xdqy1aG9HxvNs87`. **No public email.** Hours: **1:00 PM - 12:00 AM every day.** |
| Public copy | Honest: fish and prawns, cooked to order. **No** crabs, rooftop, family rooms, AC hall, tandoor/coast mythology. |
| Public → admin | **No link.** Staff type `/admin/login`. |
| Schema, RLS, triggers, views | Applied by hand in the SQL editor. |
| Menu and tables | As the owner wants them. |
| Auth | Google (owner) works. Email+password (waiter) works. **Public signup off — must stay off.** |
| Owner | `super_admin`. |
| POS, reports, audit | Walked live. Existing bills are real rows. |
| Service-role key | Set in `.env.local`. |
| Sales wipe / gallery photos / deploy | **Parked.** |

---

## Live Supabase

- **Ref:** `hoxifrmqlrjdloyeaaed` — `https://hoxifrmqlrjdloyeaaed.supabase.co`
- Applied in the dashboard SQL editor, filename order:
  `20260918120000_schema.sql`, `20260918120100_policies.sql`,
  `20260918120200_floor_snapshot.sql`, then `seed.sql`.
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
/admin/login            Google + email/password — not linked from the public site
/admin/auth/callback    OAuth code exchange, ungated on purpose
/admin/no-access
/admin                  waiters → floor, managers → reports
/admin/tables           floor
/admin/orders[/[orderId]]
/admin/menu             manager
/admin/floor-setup      manager
/admin/staff            manager
/admin/reports          manager; /waiters/[waiterId]; /export CSV
/admin/audit            super admin
/admin/bills/[orderId]  printable, no sidebar
```

`src/app/` = routes, `src/modules/` = features, `src/shared/` = clients, types,
UI. Annotated tree is in `HANDOVER.md`.

Public chrome lives in `src/modules/public/components/` (hero, ocean scene,
page heroes, header/footer). Contact also exposes WhatsApp via `whatsappHref`
in `restaurant.ts`. **No public email.**

---

## Roles

| Role | Can |
| --- | --- |
| **Waiter** | Own orders only. 2-minute window to delete a mis-tap; after that a manager void. |
| **Manager** | All live orders, voids, discounts, menu/table CRUD, waiter logins, reports. |
| **Super Admin** | Everything, plus audit, role changes, reopening settled bills. |

Staff are **switched off, never deleted**.

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
- Deploy. When asked: Vercel with the three env vars, then add the production
  origin to Supabase Auth URL Configuration **and** Google's redirect URIs.
  Keep public signup off.

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
