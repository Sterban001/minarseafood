import { createServerSupabase } from "@/shared/supabase/server";
import type { AuditEntry } from "@/shared/types/database";

export const auditPageSize = 100;

export type AuditFilters = {
  actorId?: string;
  action?: string;
  entity?: string;
  /** Keyset pagination: only entries older than this row id. */
  before?: number;
};

/**
 * Newest first. Paging walks backwards through `id` rather than using an offset
 * so a busy service writing new rows cannot shuffle entries between pages.
 */
export async function getAuditEntries(
  filters: AuditFilters,
): Promise<{ entries: AuditEntry[]; hasOlder: boolean }> {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("audit_log")
    .select("*")
    .order("id", { ascending: false })
    // One extra row is the cheapest way to know whether an older page exists.
    .limit(auditPageSize + 1);

  if (filters.actorId) query = query.eq("actor_id", filters.actorId);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.entity) query = query.eq("entity", filters.entity);
  if (filters.before) query = query.lt("id", filters.before);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  return { entries: rows.slice(0, auditPageSize), hasOlder: rows.length > auditPageSize };
}

/** Everyone who could appear in the actor column, for the filter dropdown. */
export async function getAuditActors() {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .order("full_name");

  if (error) throw new Error(error.message);
  return data ?? [];
}
