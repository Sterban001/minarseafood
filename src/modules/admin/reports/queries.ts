import { createServerSupabase } from "@/shared/supabase/server";
import { eachDate } from "@/shared/lib/dates";
import { round2, toNumber } from "@/shared/lib/money";
import type {
  CounterSalesByItem,
  CounterSalesHourly,
  Expense,
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

// ---------------------------------------------------------------------------
// Expenses Report Breakdown
// ---------------------------------------------------------------------------

export type ExpenseTotals = {
  grandTotal: number;
  salariesTotal: number;
  itemsTotal: number;
  othersTotal: number;
  count: number;
};

export type DailyExpensePoint = {
  date: string;
  grandTotal: number;
  salariesTotal: number;
  itemsTotal: number;
  othersTotal: number;
};

export type ExpenseCategoryRow = {
  category: string;
  amount: number;
  count: number;
};

export async function getExpensesReport(range: DateRange): Promise<{
  totals: ExpenseTotals;
  daily: DailyExpensePoint[];
  categories: ExpenseCategoryRow[];
}> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("business_date", range.from)
    .lte("business_date", range.to)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[getExpensesReport]", error.message);
    return {
      totals: { grandTotal: 0, salariesTotal: 0, itemsTotal: 0, othersTotal: 0, count: 0 },
      daily: eachDate(range.from, range.to).map((date) => ({
        date,
        grandTotal: 0,
        salariesTotal: 0,
        itemsTotal: 0,
        othersTotal: 0,
      })),
      categories: [],
    };
  }

  const expenses = (data ?? []) as Expense[];

  let salariesTotal = 0;
  let itemsTotal = 0;
  let othersTotal = 0;

  const byDate = new Map<
    string,
    { grandTotal: number; salariesTotal: number; itemsTotal: number; othersTotal: number }
  >();
  const byCat = new Map<string, { amount: number; count: number }>();

  for (const e of expenses) {
    const amt = toNumber(e.amount);
    const date = e.business_date;

    const dateEntry = byDate.get(date) ?? {
      grandTotal: 0,
      salariesTotal: 0,
      itemsTotal: 0,
      othersTotal: 0,
    };
    dateEntry.grandTotal += amt;

    if (e.expense_type === "salary") {
      salariesTotal += amt;
      dateEntry.salariesTotal += amt;
      const catKey = "Staff Salaries";
      const catEntry = byCat.get(catKey) ?? { amount: 0, count: 0 };
      catEntry.amount += amt;
      catEntry.count += 1;
      byCat.set(catKey, catEntry);
    } else if (e.expense_type === "daily_item") {
      itemsTotal += amt;
      dateEntry.itemsTotal += amt;
      const catKey = e.category || "Kitchen Supplies";
      const catEntry = byCat.get(catKey) ?? { amount: 0, count: 0 };
      catEntry.amount += amt;
      catEntry.count += 1;
      byCat.set(catKey, catEntry);
    } else {
      othersTotal += amt;
      dateEntry.othersTotal += amt;
      const catKey = e.category || "Miscellaneous";
      const catEntry = byCat.get(catKey) ?? { amount: 0, count: 0 };
      catEntry.amount += amt;
      catEntry.count += 1;
      byCat.set(catKey, catEntry);
    }

    byDate.set(date, dateEntry);
  }

  const grandTotal = round2(salariesTotal + itemsTotal + othersTotal);

  const daily: DailyExpensePoint[] = eachDate(range.from, range.to).map((date) => {
    const entry = byDate.get(date);
    return {
      date,
      grandTotal: entry ? round2(entry.grandTotal) : 0,
      salariesTotal: entry ? round2(entry.salariesTotal) : 0,
      itemsTotal: entry ? round2(entry.itemsTotal) : 0,
      othersTotal: entry ? round2(entry.othersTotal) : 0,
    };
  });

  const categories: ExpenseCategoryRow[] = [...byCat.entries()]
    .map(([category, { amount, count }]) => ({
      category,
      amount: round2(amount),
      count,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totals: {
      grandTotal,
      salariesTotal: round2(salariesTotal),
      itemsTotal: round2(itemsTotal),
      othersTotal: round2(othersTotal),
      count: expenses.length,
    },
    daily,
    categories,
  };
}

export const defaultRange = (): DateRange => {
  const { todayBusinessDate } = require("@/shared/lib/dates");
  const today = todayBusinessDate();
  return { from: today, to: today };
};
