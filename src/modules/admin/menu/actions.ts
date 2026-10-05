"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabase } from "@/shared/supabase/server";
import { round2 } from "@/shared/lib/money";

import { done, fail, guarded, managerActor, type ActionResult } from "../lib/action-result";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const flag = (form: FormData, key: string) => form.get(key) === "on";
const int = (form: FormData, key: string, fallback = 0) => {
  const parsed = Number.parseInt(text(form, key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Menu edits change the public site too, so both caches are dropped. */
function refreshMenu() {
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function saveCategory(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();
    const id = text(form, "id");
    const name = text(form, "name");
    const sortOrder = int(form, "sortOrder");
    const isActive = flag(form, "isActive");

    if (name.length < 2) return fail("Give the section a name.");

    const supabase = await createServerSupabase();

    if (id) {
      const { error } = await supabase
        .from("menu_categories")
        .update({ name, sort_order: sortOrder, is_active: isActive })
        .eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("menu_categories")
        .insert({ name, sort_order: sortOrder, is_active: isActive });
      if (error) throw new Error(error.message);
    }

    refreshMenu();
    return done(id ? "Section updated." : `“${name}” added.`);
  });
}

export async function deleteCategory(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();
    const id = text(form, "id");

    const supabase = await createServerSupabase();
    const { count } = await supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    if (count) {
      return fail(
        `That section still has ${count} ${count === 1 ? "dish" : "dishes"} in it. Move or delete them first, or just switch the section off.`,
      );
    }

    const { error } = await supabase.from("menu_categories").delete().eq("id", id);
    if (error) throw new Error(error.message);

    refreshMenu();
    return done("Section deleted.");
  });
}

// ---------------------------------------------------------------------------
// Dishes
// ---------------------------------------------------------------------------

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const allowedPhotoTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Puts a dish photo in the public `menu` bucket. The storage policy also checks
 * `is_manager()`, so a waiter cannot upload even if they reach this code.
 */
async function uploadPhoto(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  candidate: FormDataEntryValue | null,
): Promise<{ url?: string; error?: string }> {
  if (!(candidate instanceof File) || candidate.size === 0) return {};

  if (!allowedPhotoTypes.includes(candidate.type)) {
    return { error: "Photos need to be JPEG, PNG, WebP or AVIF." };
  }
  if (candidate.size > MAX_PHOTO_BYTES) {
    return { error: "That photo is over 5 MB. Shrink it and try again." };
  }

  const extension = candidate.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `dishes/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from("menu").upload(path, candidate, {
    contentType: candidate.type,
    upsert: false,
  });

  if (error) return { error: `Could not upload the photo: ${error.message}` };

  const { data } = supabase.storage.from("menu").getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function saveMenuItem(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();

    const id = text(form, "id");
    const categoryId = text(form, "categoryId");
    const name = text(form, "name");
    const description = text(form, "description");
    const price = round2(Number.parseFloat(text(form, "price")));
    const sortOrder = int(form, "sortOrder");

    if (!categoryId) return fail("Pick a section for this dish.");
    if (name.length < 2) return fail("Give the dish a name.");
    if (!Number.isFinite(price) || price < 0) return fail("Enter a valid price.");

    const supabase = await createServerSupabase();

    const uploaded = await uploadPhoto(supabase, form.get("image"));
    if (uploaded.error) return fail(uploaded.error);
    const imageUrl = uploaded.url ?? text(form, "imageUrl");

    const payload = {
      category_id: categoryId,
      name,
      description: description || null,
      price,
      image_url: imageUrl || null,
      sort_order: sortOrder,
      is_available: flag(form, "isAvailable"),
      is_featured: flag(form, "isFeatured"),
    };

    if (id) {
      const { error } = await supabase.from("menu_items").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("menu_items").insert(payload);
      if (error) throw new Error(error.message);
    }

    refreshMenu();
    return done(id ? `${name} updated.` : `${name} added to the menu.`);
  });
}

/** The one a manager taps twenty times a night when the kitchen runs out. */
export async function toggleAvailability(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();
    const id = text(form, "id");
    const available = form.get("available") === "true";

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: available })
      .eq("id", id);

    if (error) throw new Error(error.message);

    refreshMenu();
    return done(available ? "Back on the menu." : "Marked sold out.");
  });
}

export async function toggleFeatured(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();
    const id = text(form, "id");
    const featured = form.get("featured") === "true";

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("menu_items")
      .update({ is_featured: featured })
      .eq("id", id);

    if (error) throw new Error(error.message);

    refreshMenu();
    return done(featured ? "Shown on the website." : "Removed from the website.");
  });
}

export async function deleteMenuItem(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();
    const id = text(form, "id");

    const supabase = await createServerSupabase();
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) throw new Error(error.message);

    refreshMenu();
    // Past bills keep their own copy of the name and price, so history is safe.
    return done("Dish deleted. Old bills are unaffected.");
  });
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export async function saveTable(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();

    const id = text(form, "id");
    const label = text(form, "label");
    const zone = text(form, "zone") || "Main Hall";
    const seats = Math.min(40, Math.max(1, int(form, "seats", 4)));
    const sortOrder = int(form, "sortOrder");

    if (!label) return fail("Give the table a name, like T4 or AC2.");

    const payload = {
      label,
      zone,
      seats,
      sort_order: sortOrder,
      is_active: flag(form, "isActive"),
    };

    const supabase = await createServerSupabase();

    if (id) {
      const { error } = await supabase.from("dining_tables").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("dining_tables").insert(payload);
      if (error) throw new Error(error.message);
    }

    revalidatePath("/admin/floor-setup");
    revalidatePath("/admin/tables");
    return done(id ? `${label} updated.` : `${label} added.`);
  });
}

export async function deleteTable(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();
    const id = text(form, "id");
    const supabase = await createServerSupabase();

    const { error } = await supabase.from("dining_tables").delete().eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/floor-setup");
    revalidatePath("/admin/tables");
    return done("Table deleted.");
  });
}

// ---------------------------------------------------------------------------
// Sections (zones)
// ---------------------------------------------------------------------------

export async function saveSection(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();

    const oldZone = text(form, "oldZone");
    const name = text(form, "name");

    if (name.length < 2) return fail("Give the section a name.");

    const supabase = await createServerSupabase();

    if (oldZone) {
      // Rename: update the zone column on every table in the old zone.
      const { error } = await supabase
        .from("dining_tables")
        .update({ zone: name })
        .eq("zone", oldZone);
      if (error) throw new Error(error.message);

      revalidatePath("/admin/floor-setup");
      revalidatePath("/admin/tables");
      return done(`"${oldZone}" renamed to "${name}".`);
    }

    // New section: check it doesn't duplicate an existing zone.
    const { data: existing } = await supabase
      .from("dining_tables")
      .select("id")
      .eq("zone", name)
      .limit(1);

    if (existing && existing.length > 0) {
      return fail(`A section called "${name}" already exists.`);
    }

    // Create one starter table so the zone actually exists in the DB.
    const { error } = await supabase.from("dining_tables").insert({
      label: "T1",
      zone: name,
      seats: 4,
      sort_order: 0,
      is_active: true,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/admin/floor-setup");
    revalidatePath("/admin/tables");
    return done(`"${name}" added with a starter table. Edit or add more tables to it.`);
  });
}

export async function deleteSection(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();

    const zone = text(form, "zone");
    if (!zone) return fail("Missing section name.");

    const supabase = await createServerSupabase();

    const { error } = await supabase
      .from("dining_tables")
      .delete()
      .eq("zone", zone);

    if (error) throw new Error(error.message);

    revalidatePath("/admin/floor-setup");
    revalidatePath("/admin/tables");
    return done("Section deleted.");
  });
}
