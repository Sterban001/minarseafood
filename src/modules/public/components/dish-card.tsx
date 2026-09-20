import { formatMoney } from "@/shared/lib/money";

import type { PublicMenuItem } from "../data/menu";
import { PhotoTile } from "./photo-tile";

export function DishCard({ dish }: { dish: PublicMenuItem }) {
  return (
    <article className="group overflow-hidden rounded-3xl bg-white shadow-[0_10px_40px_-24px_rgba(12,39,44,0.45)] ring-1 ring-brand-950/8 transition-transform duration-300 hover:-translate-y-1">
      <PhotoTile
        src={dish.image_url ?? undefined}
        alt={dish.name}
        label={dish.name}
        className="aspect-4/3 rounded-none ring-0"
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl leading-snug font-semibold text-ink">
            {dish.name}
          </h3>
          <p className="shrink-0 font-display text-lg font-semibold text-spice-700">
            {formatMoney(dish.price)}
          </p>
        </div>
        {dish.description ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{dish.description}</p>
        ) : null}
        {dish.is_available ? null : (
          <p className="mt-3 text-xs font-semibold tracking-wide text-red-700 uppercase">
            Sold out today
          </p>
        )}
      </div>
    </article>
  );
}

/** Dense two-column row used on the full menu page. */
export function DishRow({ dish }: { dish: PublicMenuItem }) {
  return (
    <li className="flex items-baseline gap-3 py-4">
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold text-ink">
          {dish.name}
          {dish.is_available ? null : (
            <span className="ml-2 align-middle font-sans text-xs font-semibold tracking-wide text-red-700 uppercase">
              sold out
            </span>
          )}
        </p>
        {dish.description ? (
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{dish.description}</p>
        ) : null}
      </div>
      <span
        aria-hidden
        className="mx-1 hidden min-w-8 flex-1 translate-y-[-4px] border-b border-dotted border-brand-900/20 sm:block"
      />
      <p className="shrink-0 font-display text-base font-semibold text-spice-700 tabular-nums">
        {formatMoney(dish.price)}
      </p>
    </li>
  );
}
