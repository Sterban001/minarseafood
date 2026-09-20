import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/shared/types/database";

import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseEnv } from "./env";

export type ServerClient = ReturnType<typeof createServerClient<Database>>;

/**
 * Request-scoped client that reads and refreshes the staff session from cookies.
 * Cookie writes are ignored when called from a Server Component (React forbids
 * them there); `proxy.ts` refreshes the session instead.
 */
export async function createServerSupabase(): Promise<ServerClient> {
  assertSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — safe to ignore.
        }
      },
    },
  });
}

/**
 * Session-less client for the public site. No cookies means responses stay
 * cacheable and visitors can only reach rows that RLS opens up to `anon`.
 */
export function createPublicSupabase(): ServerClient {
  assertSupabaseEnv();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });
}
