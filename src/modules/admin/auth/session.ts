import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/shared/supabase/env";
import { createServerSupabase } from "@/shared/supabase/server";
import type { AppRole, Profile } from "@/shared/types/database";

export type StaffSession = {
  userId: string;
  email: string | null;
  profile: Profile;
};

export type StaffLookup =
  | { state: "signed-out" }
  | { state: "no-profile"; userId: string; email: string | null }
  | { state: "deactivated"; profile: Profile }
  | { state: "ok"; session: StaffSession };

/**
 * Resolves the signed-in staff member. Distinguishes "not signed in" from
 * "signed in but switched off" so the shell can explain what happened instead
 * of bouncing someone between login and home in a loop.
 */
export async function lookupStaff(): Promise<StaffLookup> {
  // Without keys there is no session to find, and the login screen explains why.
  if (!hasSupabaseEnv) return { state: "signed-out" };

  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { state: "signed-out" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return { state: "no-profile", userId: user.id, email: user.email ?? null };
  }

  if (!profile.is_active) return { state: "deactivated", profile };

  return {
    state: "ok",
    session: { userId: user.id, email: user.email ?? null, profile },
  };
}

/** The caller must be active staff, or they get sent somewhere that explains why not. */
export async function requireStaff(): Promise<StaffSession> {
  const result = await lookupStaff();
  if (result.state === "ok") return result.session;
  if (result.state === "signed-out") redirect("/admin/login");
  redirect("/admin/no-access");
}

export async function requireRole(...allowed: AppRole[]): Promise<StaffSession> {
  const session = await requireStaff();
  if (!allowed.includes(session.profile.role)) {
    redirect(`/admin/no-access?need=${allowed.join(",")}`);
  }
  return session;
}

export const requireManager = () => requireRole("super_admin", "manager");
export const requireSuperAdmin = () => requireRole("super_admin");

export const isManagerRole = (role: AppRole) =>
  role === "super_admin" || role === "manager";
export const isSuperAdminRole = (role: AppRole) => role === "super_admin";

export const roleLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  waiter: "Waiter",
};

export const roleBlurbs: Record<AppRole, string> = {
  super_admin: "Full access, all history, staff and audit trail",
  manager: "Live floor, voids, discounts, menu and staff",
  waiter: "Own tables only",
};

/** Where each role lands after signing in. */
export function homeForRole(_role: AppRole): string {
  return "/admin";
}

/**
 * Where to send someone once they are signed in. Only relative `/admin` paths
 * are trusted: an open redirect on a login screen is a phishing hole, and this
 * has to stay the single copy of that rule for every sign-in method.
 */
export function adminDestination(
  next: string | null | undefined,
  role: AppRole,
): string {
  const target = (next ?? "").trim();
  return target.startsWith("/admin") && !target.startsWith("/admin/login")
    ? target
    : homeForRole(role);
}
