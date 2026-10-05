"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabase } from "@/shared/supabase/server";

import { actor } from "../lib/action-result";

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
 *
 * @param items  Cart lines (menuItemId + name + price + qty).
 * @param tableId  Optional dining table id — when set, the receipt shows the table.
 */
export async function createSale(
  items: SaleCartItem[],
  tableId?: string | null,
): Promise<CreateSaleResult> {
  try {
    const session = await actor();

    if (!items.length) return { ok: false, error: "Add at least one item." };

    const supabase = await createServerSupabase();

    // 1. Insert the sale header (sale_no and total are set by triggers).
    const insertPayload: { created_by: string; table_id?: string } = {
      created_by: session.userId,
    };
    if (tableId) insertPayload.table_id = tableId;

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert(insertPayload)
      .select("id, sale_no")
      .single();

    if (saleError || !sale) {
      console.error("[createSale] sale insert", saleError);
      return { ok: false, error: "Could not create sale. Try again." };
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
      return { ok: false, error: "Could not save the items. Try again." };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/history");
    revalidatePath("/admin/reports");
    revalidatePath("/admin/tables");

    return { ok: true, saleId: sale.id, saleNo: sale.sale_no, message: `Sale #${sale.sale_no}` };
  } catch (error) {
    console.error("[createSale]", error);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}

/**
 * Marks all unbilled sales for a given table as billed/settled today,
 * turning the table back to idle (available).
 */
export async function settleTableBill(tableId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await actor();
    const supabase = await createServerSupabase();
    const { todayBusinessDate } = await import("@/shared/lib/dates");

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("sales")
      .update({ table_billed_at: nowIso })
      .eq("table_id", tableId)
      .eq("business_date", todayBusinessDate())
      .is("table_billed_at", null);

    if (error) {
      console.error("[settleTableBill]", error);
      return { ok: false, error: "Failed to settle table bill." };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/tables");
    revalidatePath("/admin/history");

    return { ok: true };
  } catch (err) {
    console.error("[settleTableBill]", err);
    return { ok: false, error: "Something went wrong." };
  }
}


