"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/shared/types/database";

import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseEnv } from "./env";

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let cached: BrowserClient | null = null;

/** Browser-side client, reused across renders so realtime sockets aren't duplicated. */
export function createClient(): BrowserClient {
  assertSupabaseEnv();
  cached ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
