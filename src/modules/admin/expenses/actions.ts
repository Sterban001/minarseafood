"use server";

import { revalidatePath } from "next/cache";

import { isValidIsoDate, todayBusinessDate } from "@/shared/lib/dates";
import { round2 } from "@/shared/lib/money";
import { createServerSupabase } from "@/shared/supabase/server";

import { actor, done, fail, guarded, type ActionResult } from "../lib/action-result";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const num = (form: FormData, key: string, fallback = 0) => {
  const parsed = Number.parseFloat(text(form, key));
  return Number.isFinite(parsed) ? parsed : fallback;
};

function resolveDate(form: FormData): string {
  const d = text(form, "date");
  return d && isValidIsoDate(d) ? d : todayBusinessDate();
}

function refresh() {
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/reports");
}

// ---------------------------------------------------------------------------
// 1. Daily Salaries
// ---------------------------------------------------------------------------

export async function createSalaryExpense(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const session = await actor();
    const supabase = await createServerSupabase();

    const date = resolveDate(form);
    const staffName = text(form, "staff_name");
    const role = text(form, "role") || null;
    const amount = round2(num(form, "amount"));
    const paymentMethod = text(form, "payment_method") || "cash";
    const notes = text(form, "notes") || null;

    if (!staffName) return fail("Staff name is required.");
    if (amount <= 0) return fail("Salary amount must be greater than ₹0.");

    const { error } = await supabase.from("expenses").insert({
      business_date: date,
      expense_type: "salary",
      staff_name: staffName,
      role,
      amount,
      payment_method: paymentMethod,
      notes,
      created_by: session.profile.id,
    });

    if (error) {
      console.error("[createSalaryExpense]", error);
      return fail(error.message);
    }

    refresh();
    return done(`Recorded salary payment of ₹${amount} for ${staffName}.`);
  });
}

// ---------------------------------------------------------------------------
// 2. Daily Expenses (Itemized by quantity & price)
// ---------------------------------------------------------------------------

export async function createItemExpense(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const session = await actor();
    const supabase = await createServerSupabase();

    const date = resolveDate(form);
    const itemName = text(form, "item_name");
    const quantity = num(form, "quantity");
    const unit = text(form, "unit") || "kg";
    const unitPrice = round2(num(form, "unit_price"));
    const category = text(form, "category") || "Raw Seafood";
    const paymentMethod = text(form, "payment_method") || "cash";
    const notes = text(form, "notes") || null;

    if (!itemName) return fail("Item name is required.");
    if (quantity <= 0) return fail("Quantity must be greater than 0.");
    if (unitPrice <= 0) return fail("Price per unit must be greater than ₹0.");

    const totalAmount = round2(quantity * unitPrice);

    const { error } = await supabase.from("expenses").insert({
      business_date: date,
      expense_type: "daily_item",
      item_name: itemName,
      quantity,
      unit,
      unit_price: unitPrice,
      amount: totalAmount,
      category,
      payment_method: paymentMethod,
      notes,
      created_by: session.profile.id,
    });

    if (error) {
      console.error("[createItemExpense]", error);
      return fail(error.message);
    }

    refresh();
    return done(`Added expense for ${itemName} (${quantity} ${unit} @ ₹${unitPrice} = ₹${totalAmount}).`);
  });
}

// ---------------------------------------------------------------------------
// 3. Miscellaneous Expenses (Others)
// ---------------------------------------------------------------------------

export async function createMiscExpense(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const session = await actor();
    const supabase = await createServerSupabase();

    const date = resolveDate(form);
    const title = text(form, "title");
    const amount = round2(num(form, "amount"));
    const category = text(form, "category") || "Miscellaneous";
    const paymentMethod = text(form, "payment_method") || "cash";
    const notes = text(form, "notes") || null;

    if (!title) return fail("Expense title/description is required.");
    if (amount <= 0) return fail("Expense amount must be greater than ₹0.");

    const { error } = await supabase.from("expenses").insert({
      business_date: date,
      expense_type: "miscellaneous",
      title,
      amount,
      category,
      payment_method: paymentMethod,
      notes,
      created_by: session.profile.id,
    });

    if (error) {
      console.error("[createMiscExpense]", error);
      return fail(error.message);
    }

    refresh();
    return done(`Recorded miscellaneous expense of ₹${amount} for ${title}.`);
  });
}

// ---------------------------------------------------------------------------
// Delete an expense entry
// ---------------------------------------------------------------------------

export async function deleteExpense(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await actor();
    const supabase = await createServerSupabase();

    if (!id) return fail("Expense ID is required.");

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      console.error("[deleteExpense]", error);
      return fail(error.message);
    }

    refresh();
    return done("Expense removed.");
  });
}
