import { createPublicSupabase } from "@/shared/supabase/server";
import { hasSupabaseEnv } from "@/shared/supabase/env";
import type { MenuItem } from "@/shared/types/database";

export type PublicMenuItem = Pick<
  MenuItem,
  "id" | "name" | "description" | "price" | "image_url" | "is_available" | "is_featured"
>;

export type MenuSection = {
  id: string;
  name: string;
  items: PublicMenuItem[];
};

const itemColumns = "id, name, description, price, image_url, is_available, is_featured";

/**
 * The menu the kitchen is actually selling today. Reads through the `anon` role,
 * so row level security limits this to items in published categories.
 */
export async function getPublicMenu(): Promise<MenuSection[]> {
  if (!hasSupabaseEnv) return [];

  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("menu_categories")
    .select(`id, name, sort_order, menu_items ( ${itemColumns}, sort_order )`)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("sort_order", { referencedTable: "menu_items", ascending: true });

  if (error) {
    console.error("[public menu]", error.message);
    return [];
  }

  return (data ?? [])
    .map((category) => ({
      id: category.id,
      name: category.name,
      items: (category.menu_items ?? []) as PublicMenuItem[],
    }))
    .filter((section) => section.items.length > 0);
}

/** A handful of dishes for the home page, preferring what the kitchen is proud of. */
export async function getFeaturedDishes(limit = 6): Promise<PublicMenuItem[]> {
  if (!hasSupabaseEnv) return [];

  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("menu_items")
    .select(itemColumns)
    .eq("is_featured", true)
    .eq("is_available", true)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[featured dishes]", error.message);
    return [];
  }

  return data ?? [];
}
