"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabase } from "@/shared/supabase/server";

import { guarded, managerActor, type ActionResult } from "../lib/action-result";

// ---------------------------------------------------------------------------
// Create a dining table
// ---------------------------------------------------------------------------

export async function createTable(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();
    const supabase = await createServerSupabase();

    const label = (form.get("label") as string)?.trim();
    const seats = parseInt(form.get("seats") as string, 10) || 4;
    const zone = (form.get("zone") as string)?.trim() || "Main Hall";
    const sortOrder = parseInt(form.get("sort_order") as string, 10) || 0;

    if (!label) return { ok: false, error: "Label is required." };

    const { error } = await supabase.from("dining_tables").insert({
      label,
      seats,
      zone,
      sort_order: sortOrder,
    });

    if (error) {
      console.error("[createTable]", error);
      if (error.code === "23505") return { ok: false, error: "That label already exists." };
      return { ok: false, error: error.message };
    }

    revalidatePath("/admin/tables");
    revalidatePath("/admin");
    return { ok: true, message: `Table ${label} added.` };
  });
}

// ---------------------------------------------------------------------------
// Update a dining table
// ---------------------------------------------------------------------------

export async function updateTable(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();
    const supabase = await createServerSupabase();

    const id = form.get("id") as string;
    const label = (form.get("label") as string)?.trim();
    const seats = parseInt(form.get("seats") as string, 10) || 4;
    const zone = (form.get("zone") as string)?.trim() || "Main Hall";
    const sortOrder = parseInt(form.get("sort_order") as string, 10) || 0;

    if (!id) return { ok: false, error: "Table ID is required." };
    if (!label) return { ok: false, error: "Label is required." };

    const { error } = await supabase
      .from("dining_tables")
      .update({ label, seats, zone, sort_order: sortOrder })
      .eq("id", id);

    if (error) {
      console.error("[updateTable]", error);
      if (error.code === "23505") return { ok: false, error: "That label already exists." };
      return { ok: false, error: error.message };
    }

    revalidatePath("/admin/tables");
    revalidatePath("/admin");
    return { ok: true, message: `Table ${label} updated.` };
  });
}

// ---------------------------------------------------------------------------
// Toggle table active state
// ---------------------------------------------------------------------------

export async function toggleTableActive(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();
    const supabase = await createServerSupabase();

    const id = form.get("id") as string;
    const isActive = form.get("is_active") === "true";

    if (!id) return { ok: false, error: "Table ID is required." };

    const { error } = await supabase
      .from("dining_tables")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (error) {
      console.error("[toggleTableActive]", error);
      return { ok: false, error: error.message };
    }

    revalidatePath("/admin/tables");
    revalidatePath("/admin");
    return { ok: true, message: isActive ? "Table hidden." : "Table shown." };
  });
}

// ---------------------------------------------------------------------------
// Delete a dining table
// ---------------------------------------------------------------------------

export async function deleteTable(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();
    const supabase = await createServerSupabase();

    const id = form.get("id") as string;
    if (!id) return { ok: false, error: "Table ID is required." };

    const { error } = await supabase.from("dining_tables").delete().eq("id", id);

    if (error) {
      console.error("[deleteTable]", error);
      if (error.message.includes("foreign key")) {
        return { ok: false, error: "Table is linked to sales and cannot be deleted. Hide it instead." };
      }
      return { ok: false, error: error.message };
    }

    revalidatePath("/admin/tables");
    revalidatePath("/admin");
    return { ok: true, message: "Table deleted." };
  });
}
