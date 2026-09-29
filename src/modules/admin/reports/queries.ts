import { createServerSupabase } from "@/shared/supabase/server";
import { eachDate } from "@/shared/lib/dates";
import { round2, toNumber } from "@/shared/lib/money";
import type {
  CounterSalesByItem,
  CounterSalesHourly,
} from "@/shared/types/database";

export type DateRange = { from: string; to: string };

// ---------------------------------------------------------------------------
// Daily summaries
// ---------------------------------------------------------------------------

export type CounterTotals = {
  sales: number;
  revenue: number;
  avgTicket: number;
};

const emptyTotals: CounterTotals = { sales: 0, revenue: 0, avgTicket: 0 };

export type DailyPoint = CounterTotals & { date: string };

/** Per-day figures across the range, with empty days filled in for the chart. */
export async function getCounterDailySales(range: DateRange): Promise<DailyPoint[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("v_counter_sales_daily")
    .select("*")
    .gte("business_date", range.from)
    .lte("business_date", range.to)
    .order("business_date");

  if (error) throw new Error(error.message);

  const byDate = new Map(
    (data ?? []).map((row) => [
      row.business_date,
      {
        date: row.business_date,
        sales: row.sale_count,
        revenue: toNumber(row.revenue),
        avgTicket: toNumber(row.avg_ticket),
      } satisfies DailyPoint,
    ]),
  );

  return eachDate(range.from, range.to).map(
    (date) => byDate.get(date) ?? { ...emptyTotals, date },
  );
}

export function sumCounterTotals(points: DailyPoint[]): CounterTotals {
  const total = points.reduce<CounterTotals>(
    (acc, point) => ({
      sales: acc.sales + point.sales,
      revenue: acc.revenue + point.revenue,
      avgTicket: 0,
    }),
    { ...emptyTotals },
  );

  return {
    ...total,
    revenue: round2(total.revenue),
    avgTicket: total.sales ? round2(total.revenue / total.sales) : 0,
  };
}

// ---------------------------------------------------------------------------
// Item-wise breakdown
// ---------------------------------------------------------------------------

export type ItemRow = {
  itemId: string | null;
  itemName: string;
  qty: number;
  revenue: number;
  saleCount: number;
};

export async function getCounterItemSales(range: DateRange): Promise<ItemRow[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("v_counter_sales_by_item")
    .select("*")
    .gte("business_date", range.from)
    .lte("business_date", range.to);

  if (error) throw new Error(error.message);

  const merged = new Map<string, ItemRow>();

  for (const row of (data ?? []) as CounterSalesByItem[]) {
    const key = row.menu_item_id ?? row.item_name;
    const current =
      merged.get(key) ??
      ({
        itemId: row.menu_item_id,
        itemName: row.item_name,
        qty: 0,
        revenue: 0,
        saleCount: 0,
      } satisfies ItemRow);

    current.qty += row.qty_sold;
    current.revenue += toNumber(row.revenue);
    current.saleCount += row.sale_count;
    merged.set(key, current);
  }

  return [...merged.values()]
    .map((row) => ({ ...row, revenue: round2(row.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
}

// ---------------------------------------------------------------------------
// Hourly breakdown
// ---------------------------------------------------------------------------

export type HourRow = { hour: number; sales: number; revenue: number };

export async function getCounterHourlySales(range: DateRange): Promise<HourRow[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("v_counter_sales_hourly")
    .select("*")
    .gte("business_date", range.from)
    .lte("business_date", range.to);

  if (error) throw new Error(error.message);

  const byHour = new Map<number, HourRow>();
  for (const row of (data ?? []) as CounterSalesHourly[]) {
    const current = byHour.get(row.hour) ?? { hour: row.hour, sales: 0, revenue: 0 };
    current.sales += row.sale_count;
    current.revenue += toNumber(row.revenue);
    byHour.set(row.hour, current);
  }

  return [...byHour.values()]
    .map((row) => ({ ...row, revenue: round2(row.revenue) }))
    .sort((a, b) => sortHour(a.hour) - sortHour(b.hour));
}

/** The sales day starts at 5am, so 11am comes before 1am on the chart. */
const sortHour = (hour: number) => (hour < 5 ? hour + 24 : hour);

export const defaultRange = (): DateRange => {
  const { todayBusinessDate } = require("@/shared/lib/dates");
  const today = todayBusinessDate();
  return { from: today, to: today };
};
