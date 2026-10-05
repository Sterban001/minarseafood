"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabase } from "@/shared/supabase/server";

import { actor } from "../lib/action-result";

import { getActiveBusinessDay } from "./queries";

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
 * Starts a new business day or reopens an existing one for the target date.
 */
export async function startDay(dateStr?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await actor();
    const supabase = await createServerSupabase();

    // 1. Check if a day is already open
    const { data: active } = await supabase
      .from("business_days")
      .select("id, date")
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (active) {
      return { ok: false, error: `A business day (${active.date}) is already open.` };
    }

    const { todayBusinessDate, isValidIsoDate } = await import("@/shared/lib/dates");
    const targetDate = dateStr && isValidIsoDate(dateStr) ? dateStr : todayBusinessDate();

    // 2. Check if a day for this date was previously opened and closed
    const { data: existing } = await supabase
      .from("business_days")
      .select("id, ended_at")
      .eq("date", targetDate)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Reopen the day
      const { error: updateErr } = await supabase
        .from("business_days")
        .update({
          ended_at: null,
          ended_by: null,
        })
        .eq("id", existing.id);

      if (updateErr) {
        console.error("[startDay] reopen error:", updateErr);
        return { ok: false, error: "Failed to reopen business day." };
      }
    } else {
      // Create new business day
      const { error: insertErr } = await supabase.from("business_days").insert({
        date: targetDate,
        started_at: new Date().toISOString(),
        started_by: session.userId,
      });

      if (insertErr) {
        console.error("[startDay] insert error:", insertErr);
        return { ok: false, error: "Failed to start business day: " + insertErr.message };
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/history");
    revalidatePath("/admin/reports");
    revalidatePath("/admin/tables");

    return { ok: true };
  } catch (err: unknown) {
    console.error("[startDay]", err);
    const msg = err instanceof Error ? err.message : "Failed to start business day.";
    return { ok: false, error: msg };
  }
}

/**
 * Ends the currently active business day.
 */
export async function endDay(): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await actor();
    const supabase = await createServerSupabase();

    const { data: active } = await supabase
      .from("business_days")
      .select("id, date")
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!active) {
      return { ok: false, error: "No business day is currently open." };
    }

    const { error: updateErr } = await supabase
      .from("business_days")
      .update({
        ended_at: new Date().toISOString(),
        ended_by: session.userId,
      })
      .eq("id", active.id);

    if (updateErr) {
      console.error("[endDay] update error:", updateErr);
      return { ok: false, error: "Failed to end business day." };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/history");
    revalidatePath("/admin/reports");
    revalidatePath("/admin/tables");

    return { ok: true };
  } catch (err: unknown) {
    console.error("[endDay]", err);
    const msg = err instanceof Error ? err.message : "Failed to end business day.";
    return { ok: false, error: msg };
  }
}

/**
 * Creates a new counter sale: inserts a `sales` row then bulk-inserts `sale_items`.
 * Enforces that a business day is active.
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

    const activeDay = await getActiveBusinessDay();
    if (!activeDay) {
      return { ok: false, error: "Business day is not started. Please start the day first." };
    }

    const supabase = await createServerSupabase();

    // 1. Insert the sale header (sale_no and total are set by triggers).
    const insertPayload: { created_by: string; table_id?: string; business_date: string } = {
      created_by: session.userId,
      business_date: activeDay.date,
    };
    if (tableId) insertPayload.table_id = tableId;

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert(insertPayload)
      .select("id, sale_no")
      .single();

    if (saleError || !sale) {
      console.error("[createSale] sale insert", saleError);
      return { ok: false, error: saleError?.message || "Could not create sale. Try again." };
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
    const activeDay = await getActiveBusinessDay();
    const businessDate = activeDay?.date ?? todayBusinessDate();

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("sales")
      .update({ table_billed_at: nowIso })
      .eq("table_id", tableId)
      .eq("business_date", businessDate)
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


