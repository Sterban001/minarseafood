import type { AppRole } from "@/shared/types/database";

import { isManagerRole, requireStaff, type StaffSession } from "../auth/session";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/** An expected, user-facing failure — rendered in the UI, not logged as a crash. */
export class ActionError extends Error {}

export const fail = (error: string): ActionResult => ({ ok: false, error });
export const done = (message?: string): ActionResult => ({ ok: true, message });

/**
 * Wraps a server action so database errors and `ActionError`s both come back as
 * something the screen can show, instead of Next.js's generic error overlay.
 * Redirects and other control-flow throws are re-thrown untouched.
 */
export async function guarded(work: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await work();
  } catch (error) {
    if (isControlFlow(error)) throw error;
    if (error instanceof ActionError) return fail(error.message);

    const message =
      error instanceof Error ? error.message : "Something went wrong. Try again.";
    console.error("[admin action]", error);
    return fail(cleanDbMessage(message));
  }
}

function isControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && /NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR)/.test(digest);
}

/** Postgres prefixes raised exceptions; the message itself is already written for staff. */
function cleanDbMessage(message: string): string {
  const cleaned = message
    .replace(/^.*?(?:ERROR|error):\s*/, "")
    .replace(/^new row violates row-level security policy.*/i, "You do not have permission to do that.")
    .replace(/duplicate key value violates unique constraint "orders_one_live_per_table".*/i, "That table already has a live order.")
    .replace(/duplicate key value violates unique constraint.*/i, "That already exists.")
    .trim();
  return cleaned || "Something went wrong. Try again.";
}

/** Staff session plus the role checks server actions need before writing. */
export async function actor(): Promise<StaffSession & { role: AppRole }> {
  const session = await requireStaff();
  return { ...session, role: session.profile.role };
}

export async function managerActor(): Promise<StaffSession> {
  const session = await requireStaff();
  if (!isManagerRole(session.profile.role)) {
    throw new ActionError("A manager needs to approve this.");
  }
  return session;
}

export async function superAdminActor(): Promise<StaffSession> {
  const session = await requireStaff();
  if (session.profile.role !== "super_admin") {
    throw new ActionError("Only a super admin can do this.");
  }
  return session;
}
