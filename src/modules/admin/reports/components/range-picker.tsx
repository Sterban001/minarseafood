import Link from "next/link";
import { Download } from "lucide-react";

import { buttonClass } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";
import { Input } from "@/shared/ui/form";

import type { ReportName } from "../exports";
import type { DateRange } from "../queries";
import { presets, rangeQuery, type ResolvedRange } from "../range";

/**
 * Presets as links and a plain GET form for custom dates: no client JavaScript,
 * and every view of the numbers is a URL the owner can bookmark or send on.
 */
export function RangePicker({
  basePath,
  resolved,
}: {
  basePath: string;
  resolved: ResolvedRange;
}) {
  const { preset, range } = resolved;

  return (
    <div className="print-hidden mb-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((option) => {
          const active = option.value === preset;
          return (
            <Link
              key={option.value}
              href={`${basePath}?preset=${option.value}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50",
              )}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      <form method="get" action={basePath} className="flex items-center gap-2">
        <label htmlFor="range-from" className="sr-only">
          From
        </label>
        <div className="w-40">
          <Input id="range-from" type="date" name="from" defaultValue={range.from} />
        </div>

        <span className="text-sm text-slate-500">to</span>

        <label htmlFor="range-to" className="sr-only">
          To
        </label>
        <div className="w-40">
          <Input id="range-to" type="date" name="to" defaultValue={range.to} />
        </div>

        <button type="submit" className={buttonClass({ variant: "outline", size: "md" })}>
          Apply
        </button>
      </form>
    </div>
  );
}

/**
 * A real anchor, not a `Link`: the target is a route handler that answers with
 * an attachment, so the browser has to handle it as a download.
 */
export function CsvLink({
  report,
  range,
  label = "CSV",
}: {
  report: ReportName;
  range: DateRange;
  label?: string;
}) {
  return (
    <a
      href={`/admin/reports/export${rangeQuery(range, { report })}`}
      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-brand-700"
    >
      <Download className="size-3.5" aria-hidden />
      {label}
    </a>
  );
}
