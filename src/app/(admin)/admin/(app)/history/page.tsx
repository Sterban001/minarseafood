import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";

import { PageHeader } from "@/modules/admin/components/admin-shell";
import { getDailyExpensesData } from "@/modules/admin/expenses/queries";
import { SalesHistoryView } from "@/modules/admin/sales/components/sales-history-view";
import { getActiveBusinessDay, getSaleDetail, getSalesHistory, type SaleDetail } from "@/modules/admin/sales/queries";
import { addDays, formatBusinessDate, isValidIsoDate, todayBusinessDate } from "@/shared/lib/dates";

export const metadata: Metadata = { title: "Sales History — Minar Sea Food" };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const activeDay = await getActiveBusinessDay();
  const defaultDate = activeDay?.date ?? todayBusinessDate();
  const dateParam = typeof sp?.date === "string" ? sp.date : undefined;
  const date = dateParam && isValidIsoDate(dateParam) ? dateParam : defaultDate;

  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const isToday = date === defaultDate;

  const [sales, expensesData] = await Promise.all([
    getSalesHistory(date),
    getDailyExpensesData(date),
  ]);

  // Pre-fetch details for all sales so the expandable view doesn't need client fetching.
  const detailEntries = await Promise.all(
    sales.map(async (s) => {
      const detail = await getSaleDetail(s.id);
      return [s.id, detail] as const;
    }),
  );
  const details: Record<string, SaleDetail> = Object.fromEntries(
    detailEntries.filter(
      (entry): entry is [string, SaleDetail] => entry[1] !== null,
    ),
  );

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalExpenses = expensesData.totals.grandTotal;
  const netDailySale = totalRevenue - totalExpenses;

  return (
    <div>
      <PageHeader
        title="Sales History"
        subtitle={
          <span className="flex items-center gap-2">
            <Link
              href={`/admin/history?date=${prev}`}
              className="rounded-md p-0.5 hover:bg-slate-100"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <span className="font-medium">{formatBusinessDate(date)}</span>
            {!isToday ? (
              <Link
                href={`/admin/history?date=${next}`}
                className="rounded-md p-0.5 hover:bg-slate-100"
              >
                <ChevronRight className="size-4" />
              </Link>
            ) : null}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            {sales.length > 0 ? (
              <span className="text-slate-600">
                <strong className="text-slate-900">{sales.length}</strong>{" "}
                {sales.length === 1 ? "sale" : "sales"}
              </span>
            ) : null}
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
              Gross: <strong className="text-slate-900 tabular-nums">₹{totalRevenue.toLocaleString("en-IN")}</strong>
            </span>
            {totalExpenses > 0 ? (
              <span className="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-red-700">
                Expenses: <strong className="tabular-nums">-₹{totalExpenses.toLocaleString("en-IN")}</strong>
              </span>
            ) : null}
            <span
              className={`rounded-md border px-2.5 py-1 font-semibold ${
                netDailySale >= 0
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              Net Sale: <strong className="tabular-nums">₹{netDailySale.toLocaleString("en-IN")}</strong>
            </span>
            <Link
              href={`/admin/daily-report?from=${date}&to=${date}`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
              title="Print daily financial audit report"
            >
              <Printer className="size-3.5 text-slate-600" />
              <span>Print Day</span>
            </Link>
          </div>
        }
      />

      <SalesHistoryView sales={sales} details={details} />
    </div>
  );
}
