import { requireStaff } from "@/modules/admin/auth/session";

/**
 * Bare wrapper for the printable bill: gated like the rest of the panel, but
 * with no sidebar or bottom bar so `window.print()` produces a clean receipt.
 */
export const dynamic = "force-dynamic";

export default async function PrintLayout({ children }: LayoutProps<"/admin">) {
  await requireStaff();

  return <div className="min-h-dvh bg-slate-100 py-6 print:bg-white print:py-0">{children}</div>;
}
