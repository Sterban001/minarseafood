import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { percentOf } from "@/shared/lib/money";
import { cn } from "@/shared/ui/cn";

export function Stat({
  label,
  value,
  hint,
  compare,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Same figure for the previous period, to show a change. */
  compare?: { current: number; previous: number; label: string };
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4",
        tone === "good" && "border-emerald-200 bg-emerald-50/40",
        tone === "warn" && "border-amber-200 bg-amber-50/40",
        tone === "danger" && "border-red-200 bg-red-50/40",
        tone === "neutral" && "border-slate-200",
      )}
    >
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
      {compare ? <Delta {...compare} /> : null}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Delta({
  current,
  previous,
  label,
}: {
  current: number;
  previous: number;
  label: string;
}) {
  if (previous === 0) {
    return (
      <p className="mt-1 text-xs text-slate-400">
        no {label} figure to compare against
      </p>
    );
  }

  const change = percentOf(current - previous, previous);
  const up = change >= 0;
  const Icon = up ? TrendingUp : TrendingDown;

  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-1 text-xs font-medium",
        up ? "text-emerald-600" : "text-red-600",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {up ? "+" : ""}
      {change}% vs {label}
    </p>
  );
}

/** Horizontal bars. Deliberately plain CSS — no chart library to ship. */
export function BarList({
  rows,
  emptyLabel = "Nothing here yet.",
  tone = "brand",
}: {
  rows: { label: string; value: number; display: string; meta?: string }[];
  emptyLabel?: string;
  tone?: "brand" | "spice";
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-slate-500">{emptyLabel}</p>;
  }

  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <ul className="space-y-2.5 px-4 py-4">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-700">{row.label}</span>
            <span className="shrink-0 font-semibold text-slate-900 tabular-nums">
              {row.display}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-full rounded-full",
                  tone === "brand" ? "bg-brand-500" : "bg-spice-500",
                )}
                style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
              />
            </div>
            {row.meta ? (
              <span className="shrink-0 text-xs text-slate-400">{row.meta}</span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Vertical columns for the daily and hourly curves. */
export function ColumnChart({
  rows,
  emptyLabel = "No sales in this period.",
}: {
  rows: { label: string; value: number; display: string; highlight?: boolean }[];
  emptyLabel?: string;
}) {
  if (rows.length === 0 || rows.every((row) => row.value === 0)) {
    return <p className="px-4 py-8 text-center text-sm text-slate-500">{emptyLabel}</p>;
  }

  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="no-scrollbar overflow-x-auto px-4 py-4">
      <div className="flex min-w-full items-end gap-1.5" style={{ height: "10rem" }}>
        {rows.map((row) => (
          <div
            key={row.label}
            className="group flex min-w-7 flex-1 flex-col items-center justify-end gap-1"
            title={`${row.label}: ${row.display}`}
          >
            <span className="text-[0.6rem] text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
              {row.display}
            </span>
            <div
              className={cn(
                "w-full rounded-t",
                row.highlight ? "bg-spice-500" : "bg-brand-500",
              )}
              style={{ height: `${Math.max(1, (row.value / max) * 100)}%` }}
            />
            <span className="max-w-full truncate text-[0.6rem] text-slate-500">
              {row.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
