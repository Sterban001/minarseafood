import { AdminShell } from "@/modules/admin/components/admin-shell";
import { requireStaff } from "@/modules/admin/auth/session";
import { getActiveBusinessDay } from "@/modules/admin/sales/queries";

/**
 * Nothing behind the staff login may ever be prerendered or cached: the floor
 * grid, live orders and takings all have to reflect this second.
 */
export const dynamic = "force-dynamic";

/**
 * The gate. `proxy.ts` already bounced anonymous requests, but this is the check
 * that actually matters for rendering, and row level security is the check that
 * matters for data.
 */
export default async function AdminAppLayout({ children }: LayoutProps<"/admin">) {
  const [session, activeDay] = await Promise.all([
    requireStaff(),
    getActiveBusinessDay(),
  ]);

  return <AdminShell session={session} activeDay={activeDay}>{children}</AdminShell>;
}
