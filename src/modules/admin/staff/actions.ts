"use server";

import { revalidatePath } from "next/cache";

import { createAdminSupabase, hasServiceRoleKey } from "@/shared/supabase/admin";
import { createServerSupabase } from "@/shared/supabase/server";
import type { AppRole } from "@/shared/types/database";

import {
  ActionError,
  done,
  fail,
  guarded,
  managerActor,
  superAdminActor,
  type ActionResult,
} from "../lib/action-result";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const roles: AppRole[] = ["super_admin", "manager", "waiter"];

function refreshStaff() {
  revalidatePath("/admin/staff");
  revalidatePath("/admin/tables");
}

/**
 * Creates the auth login with the service key, then sets the role through the
 * acting super admin's own session. That second step matters: the database
 * trigger always creates new accounts as `waiter`, because signup metadata comes
 * from a client and cannot be trusted to name its own role.
 */
export async function createStaff(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const me = await managerActor();

    const email = text(form, "email").toLowerCase();
    const fullName = text(form, "fullName");
    const phone = text(form, "phone");
    const password = String(form.get("password") ?? "");
    const role = text(form, "role") as AppRole;

    if (!fullName || fullName.length < 2) return fail("Enter the person's name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email.");
    if (password.length < 8) return fail("Passwords need at least 8 characters.");
    if (!roles.includes(role)) return fail("Pick a role.");

    // Only a super admin hands out anything above waiter.
    if (role !== "waiter" && me.profile.role !== "super_admin") {
      return fail("Only a super admin can create managers and super admins.");
    }

    if (!hasServiceRoleKey()) {
      return fail(
        "SUPABASE_SERVICE_ROLE_KEY is missing from .env.local, so new logins cannot be created yet.",
      );
    }

    const admin = createAdminSupabase();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });

    if (createError || !created.user) {
      const message = createError?.message ?? "Could not create that login.";
      if (/already/i.test(message)) {
        return fail("There is already a login with that email.");
      }
      throw new ActionError(message);
    }

    // The trigger has made a waiter profile by now. Fill in the rest as the
    // signed-in user, so guard_profile_changes() still applies.
    const supabase = await createServerSupabase();
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null, role })
      .eq("id", created.user.id);

    if (profileError) {
      return fail(
        `The login was created, but the role could not be set: ${profileError.message}`,
      );
    }

    refreshStaff();
    return done(`${fullName} can now sign in with ${email}.`);
  });
}

export async function updateStaff(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await managerActor();

    const id = text(form, "id");
    const fullName = text(form, "fullName");
    const phone = text(form, "phone");

    if (!fullName || fullName.length < 2) return fail("Enter a name.");

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null })
      .eq("id", id);

    if (error) throw new Error(error.message);

    refreshStaff();
    return done("Saved.");
  });
}

export async function changeRole(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const me = await superAdminActor();
    const id = text(form, "id");
    const role = text(form, "role") as AppRole;

    if (!roles.includes(role)) return fail("Pick a role.");
    if (id === me.userId && role !== "super_admin") {
      return fail("Ask another super admin to change your own role.");
    }

    const supabase = await createServerSupabase();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) throw new Error(error.message);

    refreshStaff();
    return done("Role updated.");
  });
}

/**
 * Deactivating is the right way to remove someone: `current_app_role()` starts
 * returning NULL for them so every policy refuses, while their past sales stay
 * attributed to their name.
 */
export async function setStaffActive(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const me = await managerActor();
    const id = text(form, "id");
    const active = form.get("active") === "true";

    if (id === me.userId && !active) {
      return fail("You cannot switch off your own login.");
    }

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: active })
      .eq("id", id);

    if (error) throw new Error(error.message);

    refreshStaff();
    return done(active ? "Login switched back on." : "Login switched off.");
  });
}

export async function resetPassword(form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const me = await managerActor();
    const id = text(form, "id");
    const password = String(form.get("password") ?? "");

    if (password.length < 8) return fail("Passwords need at least 8 characters.");
    if (!hasServiceRoleKey()) {
      return fail("SUPABASE_SERVICE_ROLE_KEY is missing, so passwords cannot be reset.");
    }

    // This path uses the service key, which skips the database guards, so the
    // rank check has to happen here: otherwise a manager could reset the super
    // admin's password and take the restaurant over.
    const supabase = await createServerSupabase();
    const { data: target } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", id)
      .maybeSingle();

    if (!target) return fail("That staff member could not be found.");
    if (target.role !== "waiter" && me.profile.role !== "super_admin") {
      return fail("Only a super admin can reset a manager's password.");
    }

    const admin = createAdminSupabase();
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) throw new ActionError(error.message);

    refreshStaff();
    return done("Password changed. Tell them the new one in person.");
  });
}
