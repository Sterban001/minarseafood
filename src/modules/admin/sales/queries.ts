import { cache } from "react";
import { createServerSupabase } from "@/shared/supabase/server";
import type { BusinessDay, DiningTable, MenuItem, MenuCategory, Sale, SaleItem } from "@/shared/types/database";

// ---------------------------------------------------------------------------
// Business Day Status
// ---------------------------------------------------------------------------

/**
 * Returns the currently active (open) business day, if any.
 * When null, the store is closed and no sales can be placed.
 * Wrapped in React cache to memoize across the entire request.
 */
export const getActiveBusinessDay = cache(async function getActiveBusinessDay(): Promise<BusinessDay | null> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("business_days")
      .select("*")
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[getActiveBusinessDay]", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("[getActiveBusinessDay] failed", err);
    return null;
  }
});

/**
 * Returns the most recent business day (either open or closed).
 * Wrapped in React cache to memoize across the entire request.
 */
export const getLatestBusinessDay = cache(async function getLatestBusinessDay(): Promise<BusinessDay | null> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("business_days")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
});

// ---------------------------------------------------------------------------
// Menu data for the Quick Sale grid
// ---------------------------------------------------------------------------

export type CategoryWithItems = MenuCategory & { items: MenuItem[] };

/**
 * Fetches active categories with their available menu items, sorted.
 * Used by the Quick Sale page to build the tappable menu grid.
 */
export async function getMenuForSale(): Promise<CategoryWithItems[]> {
  const supabase = await createServerSupabase();

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (!categories?.length) return [];

  const { data: items } = await supabase
    .from("menu_items")
    .select("*")
    .eq("is_available", true)
    .order("sort_order")
    .order("name");

  const itemsByCategory = new Map<string, MenuItem[]>();
  for (const item of items ?? []) {
    const list = itemsByCategory.get(item.category_id) ?? [];
    list.push(item);
    itemsByCategory.set(item.category_id, list);
  }

  return categories
    .map((cat) => ({ ...cat, items: itemsByCategory.get(cat.id) ?? [] }))
    .filter((cat) => cat.items.length > 0);
}

// ---------------------------------------------------------------------------
// Dining tables & Takeaway slots for the selector
// ---------------------------------------------------------------------------

/**
 * Ensures default Takeaway slots exist in dining_tables for Takeaway Consolidated Billing.
 */
export async function ensureTakeawayTables(): Promise<void> {
  try {
    const { hasServiceRoleKey, createAdminSupabase } = await import("@/shared/supabase/admin");
    const supabase = hasServiceRoleKey() ? createAdminSupabase() : await createServerSupabase();

    const { data: existing } = await supabase
      .from("dining_tables")
      .select("id")
      .eq("zone", "Takeaway")
      .limit(1);

    if (!existing || existing.length === 0) {
      const defaults = [
        { label: "Takeaway 1", seats: 1, zone: "Takeaway", sort_order: 101, is_active: true },
        { label: "Takeaway 2", seats: 1, zone: "Takeaway", sort_order: 102, is_active: true },
        { label: "Takeaway 3", seats: 1, zone: "Takeaway", sort_order: 103, is_active: true },
        { label: "Takeaway 4", seats: 1, zone: "Takeaway", sort_order: 104, is_active: true },
        { label: "Takeaway 5", seats: 1, zone: "Takeaway", sort_order: 105, is_active: true },
      ];
      await supabase.from("dining_tables").insert(defaults);
    }
  } catch (err) {
    console.warn("[ensureTakeawayTables]", err);
  }
}

/**
 * Fetches all active dining tables and takeaway slots, ordered by sort_order.
 */
export async function getDiningTables(): Promise<DiningTable[]> {
  const supabase = await createServerSupabase();

  let { data } = await supabase
    .from("dining_tables")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("label");

  if (!data?.some((t) => t.zone === "Takeaway")) {
    await ensureTakeawayTables();
    const { data: refreshed } = await supabase
      .from("dining_tables")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("label");
    data = refreshed;
  }

  return data ?? [];
}

// ---------------------------------------------------------------------------
// Sale detail (for the receipt page)
// ---------------------------------------------------------------------------

export type SaleDetail = {
  sale: Sale & { table_label: string | null };
  items: SaleItem[];
};

export async function getSaleDetail(saleId: string): Promise<SaleDetail | null> {
  const supabase = await createServerSupabase();

  const [saleRes, itemsRes] = await Promise.all([
    supabase
      .from("sales")
      .select("*")
      .eq("id", saleId)
      .maybeSingle(),
    supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", saleId)
      .order("created_at"),
  ]);

  const sale = saleRes.data;
  if (!sale) return null;

  // Resolve table label if the sale is linked to a table.
  let table_label: string | null = null;
  if (sale.table_id) {
    const { data: table } = await supabase
      .from("dining_tables")
      .select("label")
      .eq("id", sale.table_id)
      .maybeSingle();
    table_label = table?.label ?? null;
  }

  return { sale: { ...sale, table_label }, items: itemsRes.data ?? [] };
}

// ---------------------------------------------------------------------------
// Sales history (for the history page)
// ---------------------------------------------------------------------------

export type SaleRow = Sale & { item_count: number; table_label: string | null };

export async function getSalesHistory(businessDate: string): Promise<SaleRow[]> {
  const supabase = await createServerSupabase();

  // Get all sales for the business date.
  const { data: sales } = await supabase
    .from("sales")
    .select("*")
    .eq("business_date", businessDate)
    .order("sale_no", { ascending: false });

  if (!sales?.length) return [];

  // Count items per sale.
  const saleIds = sales.map((s) => s.id);
  const { data: counts } = await supabase
    .from("sale_items")
    .select("sale_id, qty")
    .in("sale_id", saleIds);

  const itemCountMap = new Map<string, number>();
  for (const row of counts ?? []) {
    itemCountMap.set(row.sale_id, (itemCountMap.get(row.sale_id) ?? 0) + row.qty);
  }

  // Resolve table labels for sales linked to tables.
  const tableIds = [...new Set(sales.filter((s) => s.table_id).map((s) => s.table_id!))];
  const tableLabelMap = new Map<string, string>();
  if (tableIds.length > 0) {
    const { data: tables } = await supabase
      .from("dining_tables")
      .select("id, label")
      .in("id", tableIds);
    for (const t of tables ?? []) {
      tableLabelMap.set(t.id, t.label);
    }
  }

  return sales.map((sale) => ({
    ...sale,
    item_count: itemCountMap.get(sale.id) ?? 0,
    table_label: sale.table_id ? (tableLabelMap.get(sale.table_id) ?? null) : null,
  }));
}

// ---------------------------------------------------------------------------
// Live Tables Status (for highlighting active tables on floor/admin)
// ---------------------------------------------------------------------------

export type LiveTableInfo = {
  tableId: string;
  isLive: boolean;
  unbilledTotal: number;
  unbilledSalesCount: number;
};

export async function getLiveTablesStatus(dateParam?: string): Promise<Record<string, LiveTableInfo>> {
  const supabase = await createServerSupabase();
  const { todayBusinessDate } = await import("@/shared/lib/dates");
  const activeDay = await getActiveBusinessDay();
  const businessDate = dateParam ?? activeDay?.date ?? todayBusinessDate();

  const { data: sales } = await supabase
    .from("sales")
    .select("id, table_id, total")
    .eq("business_date", businessDate)
    .not("table_id", "is", null)
    .is("table_billed_at", null);

  const map: Record<string, LiveTableInfo> = {};
  for (const s of sales ?? []) {
    if (!s.table_id) continue;
    const existing = map[s.table_id] ?? {
      tableId: s.table_id,
      isLive: true,
      unbilledTotal: 0,
      unbilledSalesCount: 0,
    };
    existing.unbilledTotal += Number(s.total);
    existing.unbilledSalesCount += 1;
    map[s.table_id] = existing;
  }

  return map;
}

// ---------------------------------------------------------------------------
// Consolidated Table Bill (for printing complete table bill)
// ---------------------------------------------------------------------------

export type TableConsolidatedBill = {
  table: DiningTable;
  businessDate: string;
  salesCount: number;
  saleNumbers: number[];
  items: Array<{
    menuItemId: string | null;
    itemName: string;
    itemPrice: number;
    qty: number;
    lineTotal: number;
  }>;
  total: number;
  firstSaleTime: string | null;
  lastSaleTime: string | null;
  isUnbilled: boolean;
};

export async function getTableConsolidatedBill(
  tableId: string,
  dateParam?: string,
): Promise<TableConsolidatedBill | null> {
  const supabase = await createServerSupabase();

  const [tableRes, activeDay] = await Promise.all([
    supabase
      .from("dining_tables")
      .select("*")
      .eq("id", tableId)
      .maybeSingle(),
    getActiveBusinessDay(),
  ]);

  const table = tableRes.data;
  if (!table) return null;

  const { todayBusinessDate } = await import("@/shared/lib/dates");
  const businessDate = dateParam ?? activeDay?.date ?? todayBusinessDate();

  // Try fetching unbilled sales for current session first
  let { data: sales } = await supabase
    .from("sales")
    .select("*")
    .eq("table_id", tableId)
    .eq("business_date", businessDate)
    .is("table_billed_at", null)
    .order("created_at", { ascending: true });

  let isUnbilled = true;

  // Fallback to all sales today if all have been billed already (reprint mode)
  if (!sales || sales.length === 0) {
    const { data: allSales } = await supabase
      .from("sales")
      .select("*")
      .eq("table_id", tableId)
      .eq("business_date", businessDate)
      .order("created_at", { ascending: true });
    sales = allSales ?? [];
    isUnbilled = false;
  }

  if (!sales || sales.length === 0) {
    return {
      table,
      businessDate,
      salesCount: 0,
      saleNumbers: [],
      items: [],
      total: 0,
      firstSaleTime: null,
      lastSaleTime: null,
      isUnbilled: false,
    };
  }

  const saleIds = sales.map((s) => s.id);
  const saleNumbers = sales.map((s) => s.sale_no);
  const firstSaleTime = sales[0]?.created_at ?? null;
  const lastSaleTime = sales[sales.length - 1]?.created_at ?? null;

  const { data: saleItems } = await supabase
    .from("sale_items")
    .select("*")
    .in("sale_id", saleIds)
    .order("created_at", { ascending: true });

  const itemMap = new Map<
    string,
    { menuItemId: string | null; itemName: string; itemPrice: number; qty: number; lineTotal: number }
  >();

  for (const item of saleItems ?? []) {
    const key = `${item.item_name}__${item.item_price}`;
    const existing = itemMap.get(key);
    if (existing) {
      existing.qty += item.qty;
      existing.lineTotal += Number(item.line_total);
    } else {
      itemMap.set(key, {
        menuItemId: item.menu_item_id,
        itemName: item.item_name,
        itemPrice: Number(item.item_price),
        qty: item.qty,
        lineTotal: Number(item.line_total),
      });
    }
  }

  const items = Array.from(itemMap.values());
  const total = sales.reduce((sum, s) => sum + Number(s.total), 0);

  return {
    table,
    businessDate,
    salesCount: sales.length,
    saleNumbers,
    items,
    total,
    firstSaleTime,
    lastSaleTime,
    isUnbilled,
  };
}



