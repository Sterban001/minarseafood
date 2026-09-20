"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabase } from "@/shared/supabase/server";
import { round2 } from "@/shared/lib/money";
import type { PaymentMethod } from "@/shared/types/database";

import { isManagerRole } from "../auth/session";
import {
  actor,
  done,
  fail,
  guarded,
  managerActor,
  superAdminActor,
  type ActionResult,
} from "../lib/action-result";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const int = (form: FormData, key: string, fallback = 0) => {
  const parsed = Number.parseInt(text(form, key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const decimal = (form: FormData, key: string) => {
  const parsed = Number.parseFloat(text(form, key));
  return Number.isFinite(parsed) ? parsed : 0;
};

const paymentMethods: PaymentMethod[] = ["cash", "card", "upi"];

function refreshFloor() {
  revalidatePath("/admin/tables");
  revalidatePath("/admin/orders");
}

function refreshOrder(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}`);
  refreshFloor();
}

// ---------------------------------------------------------------------------
// Opening and closing tables
// ---------------------------------------------------------------------------

export async function openOrder(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const me = await actor();
    const supabase = await createServerSupabase();

    const tableId = text(form, "tableId");
    const guests = Math.min(99, Math.max(0, int(form, "guestCount", 2)));
    const requestedWaiter = text(form, "waiterId");

    // Only a manager may open a table on somebody else's behalf.
    const waiterId =
      isManagerRole(me.role) && requestedWaiter ? requestedWaiter : me.userId;

    const { data, error } = await supabase
      .from("orders")
      .insert({
        table_id: tableId || null,
        waiter_id: waiterId,
        guest_count: guests,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    refreshFloor();
    redirect(`/admin/orders/${data.id}`);
  });
}

export async function markBilled(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await actor();
    const orderId = text(form, "orderId");
    const supabase = await createServerSupabase();

    const { data: order, error: readError } = await supabase
      .from("orders")
      .select("subtotal")
      .eq("id", orderId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!order) return fail("That order is no longer open.");
    if (Number(order.subtotal) <= 0) {
      return fail("Nothing has been punched on this table yet.");
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: "billed" })
      .eq("id", orderId);

    if (error) throw new Error(error.message);

    refreshOrder(orderId);
    return done("Bill printed. Collect payment to settle.");
  });
}

export async function settleOrder(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await actor();
    const orderId = text(form, "orderId");
    const method = text(form, "paymentMethod") as PaymentMethod;

    if (!paymentMethods.includes(method)) {
      return fail("Choose cash, card or UPI.");
    }

    const supabase = await createServerSupabase();
    const { data: order, error: readError } = await supabase
      .from("orders")
      .select("status, subtotal")
      .eq("id", orderId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!order) return fail("That order could not be found.");
    if (order.status === "paid") return fail("This bill is already settled.");
    if (Number(order.subtotal) <= 0) {
      return fail("An empty table cannot be settled — cancel it instead.");
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: "paid", payment_method: method })
      .eq("id", orderId);

    if (error) throw new Error(error.message);

    refreshOrder(orderId);
    return done("Settled. The table is free again.");
  });
}

export async function cancelOrder(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();
    const orderId = text(form, "orderId");
    const reason = text(form, "reason");

    if (reason.length < 3) return fail("Give a short reason for cancelling.");

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled", cancel_reason: reason })
      .eq("id", orderId);

    if (error) throw new Error(error.message);

    refreshOrder(orderId);
    return done("Order cancelled.");
  });
}

export async function reopenOrder(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await superAdminActor();
    const orderId = text(form, "orderId");

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("orders")
      .update({ status: "open", cancel_reason: null })
      .eq("id", orderId);

    if (error) throw new Error(error.message);

    refreshOrder(orderId);
    return done("Reopened. This is recorded in the audit trail.");
  });
}

// ---------------------------------------------------------------------------
// Items on the ticket
// ---------------------------------------------------------------------------

export async function addItem(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await actor();
    const orderId = text(form, "orderId");
    const menuItemId = text(form, "menuItemId");

    if (!orderId || !menuItemId) return fail("Pick something from the menu.");

    const supabase = await createServerSupabase();

    // Tapping the same dish twice should read as "2 x Crab", not two lines.
    // Lines carrying a note stay separate, because the note applies to a plate.
    const { data: existing } = await supabase
      .from("order_items")
      .select("id, qty")
      .eq("order_id", orderId)
      .eq("menu_item_id", menuItemId)
      .is("voided_at", null)
      .is("notes", null)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("order_items")
        .update({ qty: existing.qty + 1 })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      // name_snapshot and unit_price_snapshot are filled in by a trigger from
      // the live menu row — prices are never taken from the browser.
      const { error } = await supabase
        .from("order_items")
        .insert({ order_id: orderId, menu_item_id: menuItemId });
      if (error) throw new Error(error.message);
    }

    refreshOrder(orderId);
    return done();
  });
}

export async function stepItemQty(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await actor();
    const itemId = text(form, "itemId");
    const orderId = text(form, "orderId");
    const delta = int(form, "delta", 1);

    const supabase = await createServerSupabase();
    const { data: item, error: readError } = await supabase
      .from("order_items")
      .select("id, qty, name_snapshot")
      .eq("id", itemId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!item) return fail("That line is no longer on the ticket.");

    const next = item.qty + delta;

    if (next < 1) {
      const { error, count } = await supabase
        .from("order_items")
        .delete({ count: "exact" })
        .eq("id", itemId);

      if (error) throw new Error(error.message);
      if (!count) {
        return fail(
          `${item.name_snapshot} has been on the ticket too long to remove. Ask a manager to void it.`,
        );
      }
      refreshOrder(orderId);
      return done(`${item.name_snapshot} removed.`);
    }

    if (next > 999) return fail("That is too many of one thing.");

    const { error } = await supabase
      .from("order_items")
      .update({ qty: next })
      .eq("id", itemId);

    if (error) throw new Error(error.message);

    refreshOrder(orderId);
    return done();
  });
}

export async function setItemNote(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await actor();
    const itemId = text(form, "itemId");
    const orderId = text(form, "orderId");
    const note = text(form, "note").slice(0, 200);

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("order_items")
      .update({ notes: note || null })
      .eq("id", itemId);

    if (error) throw new Error(error.message);

    refreshOrder(orderId);
    return done(note ? "Note added for the kitchen." : "Note cleared.");
  });
}

export async function voidItem(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const me = await managerActor();
    const itemId = text(form, "itemId");
    const orderId = text(form, "orderId");
    const reason = text(form, "reason");

    if (reason.length < 3) return fail("Say why this is being voided.");

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("order_items")
      .update({
        voided_at: new Date().toISOString(),
        voided_by: me.userId,
        void_reason: reason,
      })
      .eq("id", itemId);

    if (error) throw new Error(error.message);

    refreshOrder(orderId);
    return done("Voided. It stays on the bill at zero, and in the audit trail.");
  });
}

// ---------------------------------------------------------------------------
// The order itself
// ---------------------------------------------------------------------------

export async function updateOrderMeta(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await actor();
    const orderId = text(form, "orderId");
    const guests = Math.min(99, Math.max(0, int(form, "guestCount", 1)));
    const notes = text(form, "notes").slice(0, 500);

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("orders")
      .update({ guest_count: guests, notes: notes || null })
      .eq("id", orderId);

    if (error) throw new Error(error.message);

    refreshOrder(orderId);
    return done("Saved.");
  });
}

export async function applyDiscount(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();
    const orderId = text(form, "orderId");
    const amount = round2(Math.max(0, decimal(form, "amount")));
    const reason = text(form, "reason");

    if (amount > 0 && reason.length < 3) {
      return fail("A discount needs a reason — it shows up in the reports.");
    }

    const supabase = await createServerSupabase();
    const { data: order, error: readError } = await supabase
      .from("orders")
      .select("subtotal")
      .eq("id", orderId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!order) return fail("That order could not be found.");
    if (amount > Number(order.subtotal)) {
      return fail("A discount cannot be more than the bill.");
    }

    const { error } = await supabase
      .from("orders")
      .update({ discount: amount, discount_reason: amount > 0 ? reason : null })
      .eq("id", orderId);

    if (error) throw new Error(error.message);

    refreshOrder(orderId);
    return done(amount > 0 ? "Discount applied." : "Discount removed.");
  });
}

export async function moveOrder(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await actor();
    const orderId = text(form, "orderId");
    const tableId = text(form, "tableId");

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("orders")
      .update({ table_id: tableId || null })
      .eq("id", orderId);

    if (error) throw new Error(error.message);

    refreshOrder(orderId);
    return done(tableId ? "Moved to the new table." : "Turned into a takeaway order.");
  });
}

export async function assignWaiter(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();
    const orderId = text(form, "orderId");
    const waiterId = text(form, "waiterId");

    if (!waiterId) return fail("Pick a waiter.");

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("orders")
      .update({ waiter_id: waiterId })
      .eq("id", orderId);

    if (error) throw new Error(error.message);

    refreshOrder(orderId);
    return done("Handed over. The sale now counts for the new waiter.");
  });
}

/** Two tables becoming one party: items move across, the empty order is cancelled. */
export async function mergeOrders(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();
    const targetId = text(form, "orderId");
    const sourceId = text(form, "sourceOrderId");

    if (!sourceId) return fail("Pick the table to merge in.");
    if (sourceId === targetId) return fail("That is the same table.");

    const supabase = await createServerSupabase();

    const { data: orders, error: readError } = await supabase
      .from("orders")
      .select("id, order_no, status")
      .in("id", [sourceId, targetId]);

    if (readError) throw new Error(readError.message);

    const target = orders?.find((order) => order.id === targetId);
    const source = orders?.find((order) => order.id === sourceId);

    if (!target || !source) return fail("One of those orders no longer exists.");
    if (target.status !== "open") {
      return fail("Merge into a table that is still open.");
    }
    if (source.status !== "open") {
      return fail("The table being merged in has already been billed.");
    }

    const { error: moveError } = await supabase
      .from("order_items")
      .update({ order_id: targetId })
      .eq("order_id", sourceId);

    if (moveError) throw new Error(moveError.message);

    const { error: closeError } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        cancel_reason: `Merged into bill #${target.order_no}`,
      })
      .eq("id", sourceId);

    if (closeError) throw new Error(closeError.message);

    refreshOrder(targetId);
    return done(`Bill #${source.order_no} merged in.`);
  });
}
