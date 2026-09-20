import { createServerSupabase } from "@/shared/supabase/server";
import { eachDate, todayBusinessDate } from "@/shared/lib/dates";
import { round2, toNumber } from "@/shared/lib/money";
import type {
  OrderStatus,
  PaymentMethod,
  SalesByItem,
  SalesByWaiter,
  SalesHourly,
  TableTurnover,
} from "@/shared/types/database";

export type DateRange = { from: string; to: string };

export type Totals = {
  orders: number;
  covers: number;
  gross: number;
  discount: number;
  net: number;
  avgTicket: number;
  cash: number;
  card: number;
  upi: number;
  voidedItems: number;
  voidedValue: number;
  cancelledOrders: number;
};

const emptyTotals: Totals = {
  orders: 0,
  covers: 0,
  gross: 0,
  discount: 0,
  net: 0,
  avgTicket: 0,
  cash: 0,
  card: 0,
  upi: 0,
  voidedItems: 0,
  voidedValue: 0,
  cancelledOrders: 0,
};

export type DailyPoint = Totals & { date: string };

/** Per-day figures across the range, with empty days filled in for the chart. */
export async function getDailySales(range: DateRange): Promise<DailyPoint[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("v_sales_daily")
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
        orders: row.orders_count,
        covers: row.covers,
        gross: toNumber(row.gross_sales),
        discount: toNumber(row.discount_total),
        net: toNumber(row.net_sales),
        avgTicket: toNumber(row.avg_ticket),
        cash: toNumber(row.cash_sales),
        card: toNumber(row.card_sales),
        upi: toNumber(row.upi_sales),
        voidedItems: row.voided_items,
        voidedValue: toNumber(row.voided_value),
        cancelledOrders: row.cancelled_orders,
      } satisfies DailyPoint,
    ]),
  );

  return eachDate(range.from, range.to).map(
    (date) => byDate.get(date) ?? { ...emptyTotals, date },
  );
}

export function sumTotals(points: DailyPoint[]): Totals {
  const total = points.reduce<Totals>(
    (acc, point) => ({
      orders: acc.orders + point.orders,
      covers: acc.covers + point.covers,
      gross: acc.gross + point.gross,
      discount: acc.discount + point.discount,
      net: acc.net + point.net,
      avgTicket: 0,
      cash: acc.cash + point.cash,
      card: acc.card + point.card,
      upi: acc.upi + point.upi,
      voidedItems: acc.voidedItems + point.voidedItems,
      voidedValue: acc.voidedValue + point.voidedValue,
      cancelledOrders: acc.cancelledOrders + point.cancelledOrders,
    }),
    { ...emptyTotals },
  );

  return {
    ...total,
    gross: round2(total.gross),
    discount: round2(total.discount),
    net: round2(total.net),
    cash: round2(total.cash),
    card: round2(total.card),
    upi: round2(total.upi),
    voidedValue: round2(total.voidedValue),
    avgTicket: total.orders ? round2(total.net / total.orders) : 0,
  };
}

export type WaiterRow = {
  waiterId: string | null;
  waiterName: string;
  orders: number;
  covers: number;
  items: number;
  gross: number;
  discount: number;
  net: number;
  avgTicket: number;
};

/** Who sold what over the range, best first. */
export async function getWaiterSales(range: DateRange): Promise<WaiterRow[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("v_sales_by_waiter")
    .select("*")
    .gte("business_date", range.from)
    .lte("business_date", range.to);

  if (error) throw new Error(error.message);

  const merged = new Map<string, WaiterRow>();

  for (const row of (data ?? []) as SalesByWaiter[]) {
    const key = row.waiter_id ?? "unassigned";
    const current =
      merged.get(key) ??
      ({
        waiterId: row.waiter_id,
        waiterName: row.waiter_name,
        orders: 0,
        covers: 0,
        items: 0,
        gross: 0,
        discount: 0,
        net: 0,
        avgTicket: 0,
      } satisfies WaiterRow);

    current.orders += row.orders_count;
    current.covers += row.covers;
    current.items += row.items_count;
    current.gross += toNumber(row.gross_sales);
    current.discount += toNumber(row.discount_total);
    current.net += toNumber(row.net_sales);
    merged.set(key, current);
  }

  return [...merged.values()]
    .map((row) => ({
      ...row,
      gross: round2(row.gross),
      discount: round2(row.discount),
      net: round2(row.net),
      avgTicket: row.orders ? round2(row.net / row.orders) : 0,
    }))
    .sort((a, b) => b.net - a.net);
}

export type ItemRow = {
  itemId: string | null;
  itemName: string;
  categoryName: string;
  qty: number;
  gross: number;
};

export async function getItemSales(range: DateRange): Promise<ItemRow[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("v_sales_by_item")
    .select("*")
    .gte("business_date", range.from)
    .lte("business_date", range.to);

  if (error) throw new Error(error.message);

  const merged = new Map<string, ItemRow>();

  for (const row of (data ?? []) as SalesByItem[]) {
    const key = row.menu_item_id ?? row.item_name;
    const current =
      merged.get(key) ??
      ({
        itemId: row.menu_item_id,
        itemName: row.item_name,
        categoryName: row.category_name,
        qty: 0,
        gross: 0,
      } satisfies ItemRow);

    current.qty += row.qty_sold;
    current.gross += toNumber(row.gross_sales);
    merged.set(key, current);
  }

  return [...merged.values()]
    .map((row) => ({ ...row, gross: round2(row.gross) }))
    .sort((a, b) => b.gross - a.gross);
}

export type CategoryRow = { categoryName: string; qty: number; gross: number };

export function rollUpCategories(items: ItemRow[]): CategoryRow[] {
  const merged = new Map<string, CategoryRow>();

  for (const item of items) {
    const current =
      merged.get(item.categoryName) ??
      { categoryName: item.categoryName, qty: 0, gross: 0 };
    current.qty += item.qty;
    current.gross += item.gross;
    merged.set(item.categoryName, current);
  }

  return [...merged.values()]
    .map((row) => ({ ...row, gross: round2(row.gross) }))
    .sort((a, b) => b.gross - a.gross);
}

export type HourRow = { hour: number; orders: number; net: number };

/** Bills settled per hour — where the rush actually is. */
export async function getHourlySales(range: DateRange): Promise<HourRow[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("v_sales_hourly")
    .select("*")
    .gte("business_date", range.from)
    .lte("business_date", range.to);

  if (error) throw new Error(error.message);

  const byHour = new Map<number, HourRow>();
  for (const row of (data ?? []) as SalesHourly[]) {
    const current = byHour.get(row.hour) ?? { hour: row.hour, orders: 0, net: 0 };
    current.orders += row.orders_count;
    current.net += toNumber(row.net_sales);
    byHour.set(row.hour, current);
  }

  return [...byHour.values()]
    .map((row) => ({ ...row, net: round2(row.net) }))
    .sort((a, b) => sortHour(a.hour) - sortHour(b.hour));
}

/** The sales day starts at 5am, so 11am comes before 1am on the chart. */
const sortHour = (hour: number) => (hour < 5 ? hour + 24 : hour);

export type TableRow = {
  tableLabel: string;
  orders: number;
  covers: number;
  net: number;
  avgMinutes: number;
};

export async function getTableTurnover(range: DateRange): Promise<TableRow[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("v_table_turnover")
    .select("*")
    .gte("business_date", range.from)
    .lte("business_date", range.to);

  if (error) throw new Error(error.message);

  const merged = new Map<string, TableRow & { minuteWeight: number }>();

  for (const row of (data ?? []) as TableTurnover[]) {
    const current =
      merged.get(row.table_label) ??
      {
        tableLabel: row.table_label,
        orders: 0,
        covers: 0,
        net: 0,
        avgMinutes: 0,
        minuteWeight: 0,
      };

    current.orders += row.orders_count;
    current.covers += row.covers;
    current.net += toNumber(row.net_sales);
    // Weight by bill count so a quiet day doesn't skew the average sitting.
    current.minuteWeight += toNumber(row.avg_minutes) * row.orders_count;
    merged.set(row.table_label, current);
  }

  return [...merged.values()]
    .map(({ minuteWeight, ...row }) => ({
      ...row,
      net: round2(row.net),
      avgMinutes: row.orders ? round2(minuteWeight / row.orders) : 0,
    }))
    .sort((a, b) => b.net - a.net);
}

export type BillRow = {
  id: string;
  orderNo: number;
  businessDate: string;
  tableLabel: string;
  waiterName: string;
  status: OrderStatus;
  guestCount: number;
  subtotal: number;
  discount: number;
  discountReason: string | null;
  total: number;
  paymentMethod: PaymentMethod | null;
  openedAt: string;
  closedAt: string | null;
  closedByName: string | null;
  cancelReason: string | null;
};

/** Every bill in the range — the end-to-end list behind the summary numbers. */
export async function getBills(
  range: DateRange,
  options: { waiterId?: string; limit?: number } = {},
): Promise<BillRow[]> {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("orders")
    .select(
      `id, order_no, business_date, status, guest_count, subtotal, discount,
       discount_reason, total, payment_method, opened_at, closed_at, cancel_reason,
       dining_tables ( label ),
       waiter:profiles!orders_waiter_id_fkey ( full_name ),
       closer:profiles!orders_closed_by_fkey ( full_name )`,
    )
    .gte("business_date", range.from)
    .lte("business_date", range.to)
    .order("business_date", { ascending: false })
    .order("order_no", { ascending: false })
    .limit(options.limit ?? 500);

  if (options.waiterId) query = query.eq("waiter_id", options.waiterId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    orderNo: row.order_no,
    businessDate: row.business_date,
    tableLabel: row.dining_tables?.label ?? "Takeaway",
    waiterName: row.waiter?.full_name ?? "Unassigned",
    status: row.status,
    guestCount: row.guest_count,
    subtotal: toNumber(row.subtotal),
    discount: toNumber(row.discount),
    discountReason: row.discount_reason,
    total: toNumber(row.total),
    paymentMethod: row.payment_method,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    closedByName: row.closer?.full_name ?? null,
    cancelReason: row.cancel_reason,
  }));
}

export type VoidRow = {
  id: string;
  itemName: string;
  qty: number;
  value: number;
  reason: string | null;
  voidedAt: string;
  voidedByName: string | null;
  addedByName: string | null;
  orderId: string;
  orderNo: number;
  businessDate: string;
};

/** Voided lines, which is where shrinkage shows up first. */
export async function getVoids(range: DateRange): Promise<VoidRow[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("order_items")
    .select(
      `id, name_snapshot, qty, unit_price_snapshot, void_reason, voided_at,
       voider:profiles!order_items_voided_by_fkey ( full_name ),
       adder:profiles!order_items_added_by_fkey ( full_name ),
       orders!inner ( id, order_no, business_date )`,
    )
    .not("voided_at", "is", null)
    .gte("orders.business_date", range.from)
    .lte("orders.business_date", range.to)
    .order("voided_at", { ascending: false })
    .limit(300);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    itemName: row.name_snapshot,
    qty: row.qty,
    value: round2(row.qty * toNumber(row.unit_price_snapshot)),
    reason: row.void_reason,
    voidedAt: row.voided_at as string,
    voidedByName: row.voider?.full_name ?? null,
    addedByName: row.adder?.full_name ?? null,
    orderId: row.orders.id,
    orderNo: row.orders.order_no,
    businessDate: row.orders.business_date,
  }));
}

export type WaiterItemRow = {
  id: string;
  itemName: string;
  qty: number;
  /** What the bill charged: zero once the line is voided. */
  lineTotal: number;
  /** What the line was worth before any void, which is the figure a void costs. */
  value: number;
  voided: boolean;
  createdAt: string;
  orderId: string;
  orderNo: number;
  businessDate: string;
  orderStatus: OrderStatus;
};

/** Lines a waiter punched in the range, for the per-waiter drilldown. */
export async function getWaiterItems(
  range: DateRange,
  waiterId: string,
): Promise<WaiterItemRow[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("order_items")
    .select(
      `id, name_snapshot, qty, unit_price_snapshot, line_total, voided_at, created_at,
       orders!inner ( id, order_no, business_date, status )`,
    )
    .eq("added_by", waiterId)
    .gte("orders.business_date", range.from)
    .lte("orders.business_date", range.to)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    itemName: row.name_snapshot,
    qty: row.qty,
    lineTotal: toNumber(row.line_total),
    value: round2(row.qty * toNumber(row.unit_price_snapshot)),
    voided: row.voided_at !== null,
    createdAt: row.created_at,
    orderId: row.orders.id,
    orderNo: row.orders.order_no,
    businessDate: row.orders.business_date,
    orderStatus: row.orders.status,
  }));
}

export const defaultRange = (): DateRange => {
  const today = todayBusinessDate();
  return { from: today, to: today };
};
