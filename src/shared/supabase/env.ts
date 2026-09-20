export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * The public site and the login screen render a helpful empty state instead of
 * crashing when the project hasn't been pointed at a Supabase instance yet.
 */
export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const MISSING_ENV_MESSAGE =
  "Supabase is not configured. Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

export function assertSupabaseEnv(): void {
  if (!hasSupabaseEnv) throw new Error(MISSING_ENV_MESSAGE);
}
