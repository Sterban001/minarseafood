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
`order_items`, `audit_log`. Enums: `app_role`, `order_status`, `payment_method`.

Must not break:

- **Money is never trusted from the browser.** The app sends
  `{order_id, menu_item_id}`. `snapshot_order_item()` copies name and price;
  `line_total` is generated; `recalc_order_subtotal()` / `apply_order_money()`
  derive subtotal and total on every write.
- **Sales day is 5am–5am, Asia/Kolkata.** Keep `business_date_for()` in SQL in
  step with `businessDateFor()` in `src/shared/lib/dates.ts`.
- **`order_no` restarts each sales day** under a per-day advisory lock.
  `assign_order_no()` is `SECURITY DEFINER` so a waiter's RLS cannot mint
  duplicates.
- **One live order per table** — partial unique index
  `orders_one_live_per_table`.
- **Reporting views use `security_invoker = true`.** Otherwise they run as the
  owner and leak the whole restaurant's numbers.
- **`floor_snapshot()`** is `SECURITY DEFINER` with a hand-picked column list
  (RLS cannot do "these columns for everyone").
- **`v_sales_*` counts `status = 'paid'` only.** The reports bill list is the
  exception. Voided `line_total` is 0 — `getVoids()` / `getWaiterItems()` use a
  separate `value` (qty × snapshot price).

| Trigger | Stops |
| --- | --- |
| `guard_order_status` | Editing settled bills; reopening paid/cancelled without super admin; settling with no payment method |
| `guard_closed_order_items` | Touching lines on a closed bill |
| `guard_waiter_order_limits` | Waiter discount / cancel / reassign |
| `guard_void_authority` | Waiter void; un-void except super admin |
| `guard_profile_changes` | Non-super-admins changing roles; last active super admin demoted or switched off |

`can_override()` = super admin **or** `postgres` / `service_role`, so the SQL
editor cannot lock the owner out.

Audit rows are written by triggers via `audit_write()` from `auth.uid()`. If
you add an `audit_write()` call, add the action in
`modules/admin/audit/format.ts` or the log shows the raw string.

---

## Auth traps

Google = owner. Email+password = floor staff (`createStaff` + service role).
Keep the Email provider **on**. Public signup **off**.
`handle_new_auth_user()` always inserts `waiter` / `is_active = true` and
ignores client metadata. `createStaff` then sets the real role on the **acting
user's session**, so `guard_profile_changes()` still applies.

- **`proxy.ts` must let `/admin/auth/*` through.** The callback arrives with no
  session. Gating it makes Google look like a Supabase failure.
- Google's redirect URI is **Supabase's**:
  `https://hoxifrmqlrjdloyeaaed.supabase.co/auth/v1/callback`. Ours
  (`/admin/auth/callback`) must be in Auth → URL Configuration → Redirect URLs.
- Callback errors are **codes**, not sentences (`login-errors.ts`).
- `adminDestination()` in `session.ts` is the only open-redirect check.
- `resetPassword` uses the service key (skips DB guards) and must keep its
  TypeScript rank check: a manager may only reset a **waiter's** password.

---

## Code map

```
src/
  proxy.ts                      /admin gate + cookie refresh
  app/
    layout.tsx                  document shell
    (public)/                   5 pages — no /admin links
    (admin)/admin/
      login/, no-access/        ungated
      auth/callback/route.ts    ungated on purpose
      (app)/layout.tsx          requireStaff() + AdminShell
      (app)/tables|orders|menu|floor-setup|staff|reports|audit
      (print)/bills/[orderId]/
  modules/admin/{auth,pos,menu,staff,reports,audit,components,lib}
  modules/public/                public-only UI (hero, ocean, header/footer)
  shared/                       supabase, database.ts, lib, ui, config
```

Keep: every server action returns `ActionResult` via `guarded()`; forms use
`<ActionForm>`; confirmations live in `<Popover>`; report tables use
`<DataTable>` with `secondary: true` for phone-hidden columns; report state
lives in the URL; `RealtimeRefresh` is `router.refresh()` + 30s poll.

Reports: manager-gated in the **page** as well as the layout. CSV
`reports/export/route.ts` checks the role itself (no layout). Waiter drilldown
has two attributions — `getWaiterSales` = bills owned, `getWaiterItems` = lines
punched. Audit pages backwards on `audit_log.id`, not offset.

`next.config.ts` allows `next/image` from the Supabase storage host derived
from `NEXT_PUBLIC_SUPABASE_URL`.

---

## Public site traps

The 20 Sep 2026 overhaul is **public-only**. Admin still uses Geist + Playfair
and the original `bg-white` body.

- **Fonts:** Outfit + Cormorant Garamond load in `src/app/(public)/layout.tsx`.
  `.public-site` in `globals.css` remaps `--font-sans` / `--font-display`. Do
  not put those fonts on the root layout or the POS wordmark changes.
- **Tokens:** `--color-ink`, `--color-foam`, `--color-pearl` and the `ocean-*`
  animations are for the public site. Hero atmosphere is `OceanScene` — keep
  its waves inside the overflow-hidden block **above** `WaveDivider`, or a
  dark wave shows under the cream edge.
- **Header** is always `bg-ink`. Transparent-on-scroll put white type on cream
  inner pages (hash jumps to `#starters` did not always set `scrolled`).
- **`buttonClass()` already includes `inline-flex`.** `hidden md:inline-flex`
  on the same node loses to `inline-flex` on mobile, so "Book a table" and the
  hamburger both show. Wrap the CTA in `<div className="hidden md:block">`.
- **`PhotoTile`:** if `caption` is set, the fallback art does not also print
  the label (gallery placeholders were doubling the sentence).
- **`phoneHref` / `whatsappHref`** live next to the address helpers in
  `restaurant.ts`. Still no public email. Still no `/admin` link.
