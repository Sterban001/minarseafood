import type { NextRequest } from "next/server";

import { isManagerRole, lookupStaff } from "@/modules/admin/auth/session";
import { buildCsvReport, isReportName } from "@/modules/admin/reports/exports";
import { resolveRange } from "@/modules/admin/reports/range";
import { csvResponse } from "@/shared/lib/csv";

/** Takings must never come out of a cache, and never out of a build. */
export const dynamic = "force-dynamic";

/**
 * A route handler sits outside the layout tree, so the `(app)` gate never runs
 * for it. The role check has to happen here, and row level security still has
 * the final say on the rows themselves.
 */
export async function GET(request: NextRequest) {
  const staff = await lookupStaff();

  if (staff.state !== "ok") {
    return new Response("Sign in to download reports.\n", { status: 401 });
  }

  if (!isManagerRole(staff.session.profile.role)) {
    return new Response("Reports are for managers only.\n", { status: 403 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const report = params.report;

  if (!isReportName(report)) {
    return new Response(
      "Unknown report. Use one of: daily, waiters, items, categories, tables, bills, voids.\n",
      { status: 400 },
    );
  }

  const { range } = resolveRange(params);
  const { filename, body } = await buildCsvReport(report, range);

  return csvResponse(filename, body);
}
