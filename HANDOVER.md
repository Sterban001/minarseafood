# MINAR SEA FOOD — engineering notes

**Read `PROJECT.md` first.** State, routes, roles, and the checklist live there.
This file is what breaks if you change it.

---

## Next.js 16 gotchas

- Middleware is **`src/proxy.ts`** exporting `proxy()`, Node runtime, no
  `middleware.ts`.
- `unauthorized()` / `forbidden()` need experimental `authInterrupts` — we
  redirect to `/admin/no-access` instead.
- `src/shared/types/database.ts` is **hand-written** (includes `Relationships`
  for nested PostgREST). `npm run db:types` writes a comparison copy to
  `supabase/types.generated.ts` and does **not** overwrite it.

---

## Database (`supabase/migrations/`)

Tables: `profiles`, `dining_tables`, `menu_categories`, `menu_items`, `orders`,
`order_items`, `sales`, `sale_items`, `audit_log`. Enums: `app_role`, `order_status`, `payment_method`.

Must not break:

- **Money is never trusted from the browser.** The app sends
  `{menuItemId, qty}`. `line_total` is a generated column (`qty * item_price`);
  `recalc_sale_total()` trigger derives `subtotal` and `total` on every write.
- **Sales day is 5am–5am, Asia/Kolkata.** Keep `business_date_for()` in SQL in
  step with `businessDateFor()` in `src/shared/lib/dates.ts`.
- **`sale_no` restarts each sales day** under a per-day advisory lock (`trg_assign_sale_no`).
  `assign_sale_no()` is `SECURITY DEFINER` so concurrent client inserts cannot mint duplicate sale numbers.
- **Reporting views use `security_invoker = true`.** `v_counter_sales_daily`, `v_counter_sales_by_item`, `v_counter_sales_hourly` respect RLS.

| Trigger | Purpose |
| --- | --- |
| `trg_assign_sale_no` | Mints daily resetting sale numbers (`#1`, `#2`) per business date under advisory lock |
| `trg_recalc_sale_total` | Re-computes sale `subtotal` and `total` whenever `sale_items` are inserted/deleted/updated |
| `guard_profile_changes` | Non-super-admins changing roles; last active super admin demoted or switched off |

`can_override()` = super admin **or** `postgres` / `service_role`, so the SQL
editor cannot lock the owner out.

Audit rows are written by triggers via `audit_write()` from `auth.uid()`.

---

## Auth traps

Google = owner. Email+password = staff (`createStaff` + service role).
Keep the Email provider **on**. Public signup **off**.
`homeForRole()` redirects all authenticated staff to `/admin` (Quick Sale).

- **`proxy.ts` must let `/admin/auth/*` through.** The callback arrives with no
  session. Gating it makes Google look like a Supabase failure.
- Google's redirect URI is **Supabase's**:
  `https://hoxifrmqlrjdloyeaaed.supabase.co/auth/v1/callback`. Ours
  (`/admin/auth/callback`) must be in Auth → URL Configuration → Redirect URLs.
- Callback errors are **codes**, not sentences (`login-errors.ts`).
- `adminDestination()` in `session.ts` is the only open-redirect check.

---

## Code map

```
src/
  proxy.ts                      /admin gate + cookie refresh
  app/
    layout.tsx                  document shell
    (public)/                   3 pages — no /admin links
    (admin)/admin/
      login/, no-access/        ungated
      auth/callback/route.ts    ungated on purpose
      (app)/layout.tsx          requireStaff() + AdminShell
      (app)/                    Quick Sale main screen
      (app)/history             Sales history with expandable details & reprint
      (app)/reports             Counter-sale reports (revenue, tickets, hourly, best sellers)
      (app)/menu                Category & dish management
      (print)/receipt/[saleId]/ Printable thermal receipt view
  modules/admin/{auth,sales,menu,reports,audit,components,lib}
  modules/public/               public-only UI (hero, ocean, header/footer)
  shared/                      supabase, database.ts, lib, ui, config
```

Keep: every server action returns `ActionResult` via `guarded()`; forms use
`<ActionForm>`; confirmations live in `<Popover>`; report state lives in the URL.

`next.config.ts` allows `next/image` from the Supabase storage host derived
from `NEXT_PUBLIC_SUPABASE_URL`.

---

## Public site traps

The 20 Sep 2026 overhaul is **public-only**. Admin still uses Geist + Playfair
- **Fonts:** Plus Jakarta Sans + Playfair Display load in `src/app/(public)/layout.tsx`.
  `.public-site` in `globals.css` remaps `--font-sans` / `--font-display`. Do
  not put those fonts on the root layout or the POS wordmark changes.
- **Tokens & Scene:** `--color-ink`, `--color-foam`, `--color-pearl` and the `ocean-*`
  animations are for the public site. Hero atmosphere is `OceanScene` with 3 distinct
  fish species (`PomfretFish`, `MackerelFish`, `SeabassFish`) submerged in lower water bounds using local smooth swimming trajectories (`swim-local-right`, `swim-local-left`).
  Render `<Waves />` before `<FishSchool />` so fish sit on top of dark wave gradient fills.
- **Buttons & Info Bar:** Primary CTAs use Frosted Glass Capsule styling (`variant: "spice"`, `bg-white/15`, `backdrop-blur-md`, `border-white/25`) to prevent eye strain on dark backgrounds. Quick info (hours, address, phone) is rendered as non-blocking floating glass chips under the CTAs.
- **Header** is always `bg-ink`. Transparent-on-scroll put white type on cream
  inner pages (hash jumps to `#starters` did not always set `scrolled`).
- **`buttonClass()` already includes `inline-flex`.** `hidden md:inline-flex`
  on the same node loses to `inline-flex` on mobile, so "Book a table" and the
  hamburger both show. Wrap the CTA in `<div className="hidden md:block">`.
- **`PhotoTile`:** if `caption` is set, the fallback art does not also print
  the label (gallery placeholders were doubling the sentence).
- **`phoneHref` / `whatsappHref`** live next to the address helpers in
  `restaurant.ts`. Still no public email. Still no `/admin` link.
- **Pages & Menu View:** Streamlined to 3 pages (`/`, `/menu`, `/contact`). `/gallery` and `/about` redirect to `/`. Menu uses `<MenuView />` in `src/modules/public/components/menu-view.tsx` with sticky category pills bar, category dish counts, and Grid/Bistro List view mode switcher.
