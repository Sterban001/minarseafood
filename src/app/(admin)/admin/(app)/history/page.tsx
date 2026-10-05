import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PageHeader } from "@/modules/admin/components/admin-shell";
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

  const sales = await getSalesHistory(date);

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
          sales.length > 0 ? (
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>
                <strong className="text-slate-900">{sales.length}</strong>{" "}
                {sales.length === 1 ? "sale" : "sales"}
              </span>
              <span>
                Total{" "}
                <strong className="text-slate-900 tabular-nums">
                  ₹{totalRevenue.toLocaleString("en-IN")}
                </strong>
              </span>
            </div>
          ) : undefined
        }
      />

      <SalesHistoryView sales={sales} details={details} />
    </div>
  );
}
