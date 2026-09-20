import { NextResponse, type NextRequest } from "next/server";

import { adminDestination } from "@/modules/admin/auth/session";
import type { LoginErrorCode } from "@/modules/admin/auth/login-errors";
import { hasSupabaseEnv } from "@/shared/supabase/env";
import { createServerSupabase } from "@/shared/supabase/server";

/** A sign-in must never be served from a cache. */
export const dynamic = "force-dynamic";

/**
 * Where Google sends the browser back to. This route has to be reachable with no
 * session at all, which is why `proxy.ts` lets `/admin/auth/*` through: the whole
 * point of the request is that it is about to create the session.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = params.get("next");

  const fail = (code: LoginErrorCode) => {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("error", code);
    if (next) login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  };

  if (!hasSupabaseEnv) return fail("provider");

  // Google reports a refusal on the query string rather than by failing the
  // request, and "signups not allowed" arrives this way too — which is what an
  // unknown Google account looks like while public signup is switched off.
  const providerError = params.get("error");
  if (providerError) {
    const description = (params.get("error_description") ?? "").toLowerCase();
    if (description.includes("signup")) return fail("unknown-account");
    return fail(providerError === "access_denied" ? "denied" : "provider");
  }

  const code = params.get("code");
  if (!code) return fail("no-code");

  const supabase = await createServerSupabase();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail("exchange");

  // The same two checks the password sign-in makes. `on_auth_user_created`
  // should always have written a profile, so a miss here means something is
  // wrong with the trigger rather than with this account.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return fail("no-profile");
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return fail("inactive");
  }

  return NextResponse.redirect(
    new URL(adminDestination(next, profile.role), request.url),
  );
}
