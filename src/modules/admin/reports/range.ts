import {
  addDays,
  daysBetween,
  formatBusinessDate,
  isValidIsoDate,
  monthRange,
  todayBusinessDate,
} from "@/shared/lib/dates";

import type { DateRange } from "./queries";

export type Preset = "today" | "yesterday" | "last7" | "last30" | "month" | "custom";

export const presets: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "month", label: "This month" },
];

type RawParams = Record<string, string | string[] | undefined>;

const one = (params: RawParams, key: string): string | undefined => {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
};

export type ResolvedRange = {
  range: DateRange;
  preset: Preset;
  /** The same length of time immediately before `range`, for comparisons. */
  previous: DateRange;
  label: string;
};

/** Turns `?preset=`/`?from=`/`?to=` into a validated range plus its predecessor. */
export function resolveRange(params: RawParams): ResolvedRange {
  const today = todayBusinessDate();
  const rawPreset = one(params, "preset") as Preset | undefined;
  const from = one(params, "from");
  const to = one(params, "to");

  let range: DateRange;
  let preset: Preset;

  if (isValidIsoDate(from) && isValidIsoDate(to)) {
    preset = rawPreset === "month" ? "month" : "custom";
    range = from <= to ? { from, to } : { from: to, to: from };
  } else {
    preset = rawPreset ?? "today";
    range = rangeForPreset(preset, today);
  }

  const span = daysBetween(range.from, range.to) + 1;

  return {
    range,
    preset,
    previous: {
      from: addDays(range.from, -span),
      to: addDays(range.to, -span),
    },
    label: describe(range, preset),
  };
}

function rangeForPreset(preset: Preset, today: string): DateRange {
  switch (preset) {
    case "yesterday": {
      const day = addDays(today, -1);
      return { from: day, to: day };
    }
    case "last7":
      return { from: addDays(today, -6), to: today };
    case "last30":
      return { from: addDays(today, -29), to: today };
    case "month":
      return monthRange(today);
    default:
      return { from: today, to: today };
  }
}

function describe(range: DateRange, preset: Preset): string {
  if (range.from === range.to) return formatBusinessDate(range.from);
  const span = daysBetween(range.from, range.to) + 1;
  const prefix = preset === "month" ? "This month · " : `${span} days · `;
  return `${prefix}${formatBusinessDate(range.from)} to ${formatBusinessDate(range.to)}`;
}

/** Reads naturally after "+12% vs …" on a stat card. */
export function comparisonLabel(preset: Preset): string {
  switch (preset) {
    case "today":
      return "yesterday";
    case "yesterday":
      return "the day before";
    default:
      // `previous` is the same number of days immediately before the range, not
      // the previous calendar month, so keep the wording vague enough to be true.
      return "the period before";
  }
}

/** Keeps the range in the URL when linking between report screens. */
export function rangeQuery(range: DateRange, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ from: range.from, to: range.to, ...extra });
  return `?${params.toString()}`;
}
