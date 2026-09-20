import { Flame } from "lucide-react";

import { formatMoney } from "@/shared/lib/money";

import type { PublicMenuItem } from "../data/menu";
import { PhotoTile } from "./photo-tile";

export function DishCard({ dish }: { dish: PublicMenuItem }) {
  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white/90 p-1 shadow-sm ring-1 ring-brand-950/8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:ring-spice-400/30">
      <div>
        <div className="relative overflow-hidden rounded-2xl">
          <PhotoTile
            src={dish.image_url ?? undefined}
            alt={dish.name}
            label={dish.name}
            className="aspect-4/3 rounded-2xl ring-0 transition-transform duration-500 group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
          {dish.is_featured ? (
            <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-spice-400/40 bg-ink/85 px-3 py-1 text-xs font-semibold tracking-wide text-spice-300 shadow-md backdrop-blur-md">
              <Flame className="size-3.5 fill-spice-400 text-spice-400" aria-hidden />
              House Favorite
            </span>
          ) : null}
          {!dish.is_available ? (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/70 backdrop-blur-xs">
              <span className="rounded-full bg-red-950/90 px-3.5 py-1 text-xs font-semibold tracking-wider text-red-200 uppercase ring-1 ring-red-500/30">
                Sold Out Today
              </span>
            </div>
          ) : null}
        </div>

        <div className="p-4 pt-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-lg leading-snug font-semibold text-ink group-hover:text-spice-700 transition-colors">
              {dish.name}
            </h3>
            <p className="shrink-0 rounded-full bg-spice-50 px-3 py-1 font-display text-base font-bold text-spice-700 ring-1 ring-spice-200/60">
              {formatMoney(dish.price)}
            </p>
          </div>
          {dish.description ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-2">
              {dish.description}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** Refined bistro menu row used on the full menu page. */
export function DishRow({ dish }: { dish: PublicMenuItem }) {
  return (
    <li className="group flex items-baseline gap-3 rounded-2xl p-3 transition-colors hover:bg-white/80">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-display text-lg font-semibold text-ink group-hover:text-spice-700 transition-colors">
            {dish.name}
          </p>
          {dish.is_featured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-spice-100/80 px-2 py-0.5 text-[0.7rem] font-semibold text-spice-800 ring-1 ring-spice-300/50">
              <Flame className="size-3 fill-spice-500 text-spice-500" aria-hidden />
              Favorite
            </span>
          ) : null}
          {!dish.is_available ? (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide text-red-800 uppercase ring-1 ring-red-200">
              Sold out
            </span>
          ) : null}
        </div>
        {dish.description ? (
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{dish.description}</p>
        ) : null}
      </div>
      <span
        aria-hidden
        className="mx-2 hidden min-w-8 flex-1 translate-y-[-4px] border-b border-dotted border-brand-900/20 sm:block"
      />
      <p className="shrink-0 font-display text-base font-bold text-spice-700 tabular-nums">
        {formatMoney(dish.price)}
      </p>
    </li>
  );
}
