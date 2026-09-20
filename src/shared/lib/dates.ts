/**
 * The restaurant serves past midnight, so a "sales day" runs from 5am to 5am.
 * An order punched at 1:30am on the 19th belongs to the 18th's business date.
 * This must stay in sync with `business_date_for()` in the SQL migrations.
 */
export const RESTAURANT_TZ = "Asia/Kolkata";
export const BUSINESS_DAY_START_HOUR = 5;

type Parts = { year: number; month: number; day: number; hour: number; minute: number };

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: RESTAURANT_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function zonedParts(date: Date): Parts {
  const parts = partsFormatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    // "24" shows up in some runtimes for midnight with hour12: false.
    hour: read("hour") % 24,
    minute: read("minute"),
  };
}

function toIsoDate(year: number, month: number, day: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** The business date (YYYY-MM-DD) that a given instant belongs to. */
export function businessDateFor(date: Date = new Date()): string {
  const { year, month, day, hour } = zonedParts(date);
  if (hour >= BUSINESS_DAY_START_HOUR) return toIsoDate(year, month, day);
  const shifted = new Date(Date.UTC(year, month - 1, day) - 86_400_000);
  return toIsoDate(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

export function todayBusinessDate(): string {
  return businessDateFor(new Date());
}

/** Moves a YYYY-MM-DD business date by whole days. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d) + days * 86_400_000);
  return toIsoDate(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000,
  );
}

/** First and last business date of the month containing `isoDate`. */
export function monthRange(isoDate: string): { from: string; to: string } {
  const [y, m] = isoDate.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: toIsoDate(y, m, 1), to: toIsoDate(y, m, lastDay) };
}

/** Every date from `from` to `to` inclusive, used to fill gaps in charts. */
export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  const total = daysBetween(from, to);
  for (let i = 0; i <= total; i += 1) out.push(addDays(from, i));
  return out;
}

export function isValidIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const longDate = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const shortDate = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

/** "Fri, 18 Sep 2026" from a plain YYYY-MM-DD business date. */
export function formatBusinessDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return longDate.format(new Date(Date.UTC(y, m - 1, d)));
}

/** "18 Sep" from a plain YYYY-MM-DD business date. */
export function formatBusinessDateShort(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return shortDate.format(new Date(Date.UTC(y, m - 1, d)));
}

const timeOnly = new Intl.DateTimeFormat("en-IN", {
  timeZone: RESTAURANT_TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dateAndTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: RESTAURANT_TZ,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "9:45 pm" in restaurant local time. */
export function formatTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return "—";
  return timeOnly.format(new Date(timestamp));
}

/** "18 Sep, 9:45 pm" in restaurant local time. */
export function formatDateTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return "—";
  return dateAndTime.format(new Date(timestamp));
}

/** "1h 23m" — how long a table has been running. */
export function formatElapsed(
  since: string | Date | null | undefined,
  now: number = Date.now(),
): string {
  if (!since) return "—";
  const minutes = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/** "5 pm" label for an hour-of-day bucket returned by the reporting views. */
export function formatHourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h < 12 ? "am" : "pm";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${suffix}`;
}
