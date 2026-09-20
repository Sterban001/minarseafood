import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabaseEnv } from "@/shared/supabase/env";

/**
 * Keeps the staff session cookie fresh and does a cheap signed-in/signed-out
 * redirect for `/admin`. This is only an optimistic gate — the real checks are
 * `requireStaff()` in the admin layout plus row level security in Postgres.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!hasSupabaseEnv) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isLoginRoute = pathname === "/admin/login";
  // The OAuth callback arrives with no session — creating one is its job — so it
  // has to be exempt from the gate or Google sign-in can never complete.
  const isCallbackRoute = pathname.startsWith("/admin/auth/");

  if (!user && !isLoginRoute && !isCallbackRoute) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    if (pathname !== "/admin") {
      login.searchParams.set("next", `${pathname}${search}`);
    }
    return NextResponse.redirect(login);
  }

  if (user && isLoginRoute) {
    const home = request.nextUrl.clone();
    home.pathname = "/admin";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
