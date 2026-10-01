// This page was removed during the counter-sale refactor (30 Sep 2026).
// Waiter-level reports are no longer part of the simplified counter-sale model.

import { redirect } from "next/navigation";

export default function WaiterReportPage() {
  redirect("/admin/reports");
}
