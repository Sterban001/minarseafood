import { createServerSupabase } from "@/shared/supabase/server";
import type { MenuItem, MenuCategory, Sale, SaleItem } from "@/shared/types/database";

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
// Sale detail (for the receipt page)
// ---------------------------------------------------------------------------

export type SaleDetail = {
  sale: Sale;
  items: SaleItem[];
};

export async function getSaleDetail(saleId: string): Promise<SaleDetail | null> {
  const supabase = await createServerSupabase();

  const { data: sale } = await supabase
    .from("sales")
    .select("*")
    .eq("id", saleId)
    .maybeSingle();

  if (!sale) return null;

  const { data: items } = await supabase
    .from("sale_items")
    .select("*")
    .eq("sale_id", saleId)
    .order("created_at");

  return { sale, items: items ?? [] };
}

// ---------------------------------------------------------------------------
// Sales history (for the history page)
// ---------------------------------------------------------------------------

export type SaleRow = Sale & { item_count: number };

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

  return sales.map((sale) => ({
    ...sale,
    item_count: itemCountMap.get(sale.id) ?? 0,
  }));
}
