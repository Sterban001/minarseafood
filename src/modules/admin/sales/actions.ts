"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabase } from "@/shared/supabase/server";

import { actor, done, fail, guarded, type ActionResult } from "../lib/action-result";

export type SaleCartItem = {
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
};

export type CreateSaleResult =
  | { ok: true; saleId: string; saleNo: number; message?: string }
  | { ok: false; error: string };

/**
 * Creates a new counter sale: inserts a `sales` row then bulk-inserts `sale_items`.
 * The DB trigger `assign_sale_no` mints a daily-resetting sale number, and
 * `recalc_sale_total` computes the total from the items.
 */
export async function createSale(items: SaleCartItem[]): Promise<CreateSaleResult> {
  try {
    const session = await actor();

    if (!items.length) return fail("Add at least one item.");

    const supabase = await createServerSupabase();

    // 1. Insert the sale header (sale_no and total are set by triggers).
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({ created_by: session.userId })
      .select("id, sale_no")
      .single();

    if (saleError || !sale) {
      console.error("[createSale] sale insert", saleError);
      return fail("Could not create sale. Try again.");
    }

    // 2. Bulk-insert the sale items (line_total is a generated column).
    const rows = items.map((item) => ({
      sale_id: sale.id,
      menu_item_id: item.menuItemId,
      item_name: item.name,
      item_price: item.price,
      qty: item.qty,
    }));

    const { error: itemsError } = await supabase.from("sale_items").insert(rows);

    if (itemsError) {
      console.error("[createSale] items insert", itemsError);
      // Clean up the orphan sale header.
      await supabase.from("sales").delete().eq("id", sale.id);
      return fail("Could not save the items. Try again.");
    }

    revalidatePath("/admin");
    revalidatePath("/admin/history");
    revalidatePath("/admin/reports");

    return { ok: true, saleId: sale.id, saleNo: sale.sale_no, message: `Sale #${sale.sale_no}` };
  } catch (error) {
    console.error("[createSale]", error);
    return fail("Something went wrong. Try again.");
  }
}
