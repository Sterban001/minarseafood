import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database";

import { SUPABASE_URL } from "./env";

/**
 * Service-role client. Bypasses RLS, so it is only used for things the Auth
 * admin API requires: creating and deactivating staff logins. Every caller must
 * check the acting user's role first — see `src/modules/admin/staff/actions.ts`.
 * Never import this from a Client Component.
 */
export function createAdminSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required to manage staff logins. Add it to .env.local.",
    );
  }

  return createClient<Database>(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const hasServiceRoleKey = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
