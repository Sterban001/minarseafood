const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const inrCompact = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** Formats a rupee amount for display, e.g. 1250.5 -> "₹1,250.5". */
export function formatMoney(value: number | string | null | undefined): string {
  return inr.format(toNumber(value));
}

/** Formats a rupee amount without the symbol, for dense tables and bills. */
export function formatAmount(value: number | string | null | undefined): string {
  return inrCompact.format(toNumber(value));
}

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Rounds to 2 decimals, avoiding float drift like 0.1 + 0.2. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function percentOf(part: number, whole: number): number {
  if (!whole) return 0;
  return round2((part / whole) * 100);
}
