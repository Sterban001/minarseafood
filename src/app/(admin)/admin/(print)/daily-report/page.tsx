import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PrintButton } from "@/modules/admin/sales/components/print-button";
import {
  getCounterDailySales,
  getCounterHourlySales,
  getCounterItemSales,
  getExpensesReport,
  sumCounterTotals,
} from "@/modules/admin/reports/queries";
import { resolveRange } from "@/modules/admin/reports/range";
import { fullAddress, restaurant } from "@/shared/config/restaurant";
import { formatBusinessDate, formatBusinessDateShort, formatHourLabel } from "@/shared/lib/dates";
import { formatAmount, formatMoney, percentOf } from "@/shared/lib/money";

export const metadata: Metadata = { title: "Financial Report — Printable" };

export default async function DailyReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  // Support both ?date=YYYY-MM-DD or standard ?from=&to=
  const rawParams = { ...sp };
  if (typeof rawParams.date === "string" && !rawParams.from && !rawParams.to) {
    rawParams.from = rawParams.date;
    rawParams.to = rawParams.date;
  }

  const resolved = resolveRange(rawParams);
  const { range, label, preset } = resolved;
  const singleDay = range.from === range.to;

  const [daily, items, hours, expenses] = await Promise.all([
    getCounterDailySales(range),
    getCounterItemSales(range),
    getCounterHourlySales(range),
    getExpensesReport(range),
  ]);

  const totals = sumCounterTotals(daily);
  const expTotal = expenses.totals.grandTotal;
  const netDailySale = totals.revenue - expTotal;
  const marginPercent = totals.revenue > 0 ? percentOf(netDailySale, totals.revenue) : 0;

  // Group raw expenses by type for itemized printing
  const rawExpenses = expenses.expenses;
  const salaryExpenses = rawExpenses.filter((e) => e.expense_type === "salary");
  const itemExpenses = rawExpenses.filter((e) => e.expense_type === "daily_item");
  const miscExpenses = rawExpenses.filter((e) => e.expense_type === "miscellaneous");

  // Merge daily sales and expenses for day-by-day table
  const dailyBreakdown = daily.map((dayPoint) => {
    const dayExp = expenses.daily.find((d) => d.date === dayPoint.date);
    const dayExpensesTotal = dayExp?.grandTotal ?? 0;
    const dayNet = dayPoint.revenue - dayExpensesTotal;
    const dayMargin = dayPoint.revenue > 0 ? percentOf(dayNet, dayPoint.revenue) : 0;
    return {
      date: dayPoint.date,
      salesCount: dayPoint.sales,
      grossRevenue: dayPoint.revenue,
      expensesTotal: dayExpensesTotal,
      netSale: dayNet,
      marginPercent: dayMargin,
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-4 print:max-w-none print:px-0">
      {/* 1. Print Screen Top Controls (Hidden on Print Paper) */}
      <div className="print-hidden mb-6 flex items-center justify-between gap-3">
        <Link
          href={`/admin/reports?from=${range.from}&to=${range.to}${preset ? `&preset=${preset}` : ""}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span>Back to reports</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Ready to print</span>
          <PrintButton autoPrint />
        </div>
      </div>

      {/* 2. Official Report Printable Sheet */}
      <div className="print-sheet rounded-2xl border border-slate-200 bg-white p-8 shadow-xs print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Restaurant Header */}
        <header className="border-b-2 border-slate-900 pb-4 text-center">
          <h1 className="font-display text-2xl font-black tracking-wider text-slate-900 uppercase">
            {restaurant.displayName}
          </h1>
          <p className="mt-1 text-xs text-slate-600">{fullAddress}</p>
          <p className="text-xs text-slate-600">Phone: {restaurant.phone}</p>
          <div className="mt-3 inline-block rounded-md bg-slate-900 px-3 py-1 text-xs font-bold tracking-wider text-white uppercase">
            {singleDay ? "Daily Sales & Expenses Audit Report" : "Business & Financial Period Report"}
          </div>
          <div className="mt-2 text-xs font-medium text-slate-700">
            <span>Period: <strong>{label}</strong></span>
          </div>
        </header>

        {/* Section 1: Core Financial Reconciliation (Expenses Canceled From Sales) */}
        <section className="mt-6">
          <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            1. Daily Sales &amp; Expenses Reconciliation
          </h2>
          <div className="mt-2 rounded-xl border border-slate-300 bg-slate-50/50 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between border-b border-slate-200 pb-2">
                <div>
                  <span className="font-bold text-slate-900">Gross Sales Revenue</span>
                  <span className="ml-2 text-xs text-slate-500">
                    ({totals.sales} {totals.sales === 1 ? "order" : "orders"} · Avg {formatMoney(totals.avgTicket)})
                  </span>
                </div>
                <span className="font-bold tabular-nums text-slate-900">
                  +{formatMoney(totals.revenue)}
                </span>
              </div>

              <div className="space-y-1 pt-1 text-xs">
                <div className="font-semibold text-slate-700">Less: Total Daily Expenses Deducted</div>
                <div className="flex justify-between pl-4 text-slate-600">
                  <span>• Staff Salaries ({expenses.totals.salariesCount} payouts)</span>
                  <span className="tabular-nums font-medium text-red-600">
                    -{formatMoney(expenses.totals.salariesTotal)}
                  </span>
                </div>
                <div className="flex justify-between pl-4 text-slate-600">
                  <span>• Kitchen Supplies ({expenses.totals.itemsCount} items)</span>
                  <span className="tabular-nums font-medium text-red-600">
                    -{formatMoney(expenses.totals.itemsTotal)}
                  </span>
                </div>
                <div className="flex justify-between pl-4 text-slate-600">
                  <span>• Miscellaneous ({expenses.totals.othersCount} entries)</span>
                  <span className="tabular-nums font-medium text-red-600">
                    -{formatMoney(expenses.totals.othersTotal)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-300 pt-1 font-semibold text-slate-800">
                  <span>Total Expenses</span>
                  <span className="tabular-nums text-red-700">
                    -{formatMoney(expTotal)}
                  </span>
                </div>
              </div>

              <div className="mt-3 border-t-2 border-slate-900 pt-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-base font-black tracking-tight text-slate-900 uppercase">
                      Net Daily Total Sale
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      (Gross Sales Revenue minus Total Expenses)
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xl font-black tabular-nums ${
                        netDailySale >= 0 ? "text-emerald-800" : "text-red-700"
                      }`}
                    >
                      {formatMoney(netDailySale)}
                    </span>
                    <span className="block text-[11px] font-semibold text-slate-600">
                      Net Margin: {marginPercent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Day-by-Day Breakdown (If Multi-Day) */}
        {!singleDay && dailyBreakdown.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              2. Day-by-Day Financial Breakdown
            </h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-600">
                    <th className="py-2 pr-3 font-semibold">Date</th>
                    <th className="py-2 px-2 text-center font-semibold">Bills</th>
                    <th className="py-2 px-2 text-right font-semibold">Gross Sales</th>
                    <th className="py-2 px-2 text-right font-semibold">Expenses Deducted</th>
                    <th className="py-2 px-2 text-right font-semibold">Net Total Sale</th>
                    <th className="py-2 pl-2 text-right font-semibold">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dailyBreakdown.map((row) => (
                    <tr key={row.date}>
                      <td className="py-2 pr-3 font-medium text-slate-900">
                        {formatBusinessDateShort(row.date)}
                      </td>
                      <td className="py-2 px-2 text-center tabular-nums text-slate-600">
                        {row.salesCount}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums font-semibold text-slate-900">
                        {formatAmount(row.grossRevenue)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-red-600">
                        {row.expensesTotal > 0 ? `-${formatAmount(row.expensesTotal)}` : "₹0"}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums font-bold text-slate-900">
                        {formatAmount(row.netSale)}
                      </td>
                      <td className="py-2 pl-2 text-right tabular-nums font-medium text-slate-600">
                        {row.marginPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Section 3: Itemized Expenses Breakdown */}
        {rawExpenses.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              {singleDay ? "2" : "3"}. Itemized Expenses Recorded ({rawExpenses.length} entries)
            </h2>

            {/* Staff Salaries */}
            {salaryExpenses.length > 0 && (
              <div className="mt-3">
                <h3 className="text-xs font-semibold text-slate-700">Staff Salaries Paid</h3>
                <table className="mt-1.5 w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500">
                      <th className="pb-1 font-medium">Staff Member</th>
                      <th className="pb-1 font-medium">Role</th>
                      <th className="pb-1 text-center font-medium">Payment Mode</th>
                      <th className="pb-1 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salaryExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="py-1 font-medium text-slate-900">{exp.staff_name}</td>
                        <td className="py-1 text-slate-600">{exp.role || "Staff"}</td>
                        <td className="py-1 text-center uppercase text-slate-500">{exp.payment_method}</td>
                        <td className="py-1 text-right font-bold tabular-nums text-slate-900">
                          {formatMoney(exp.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Kitchen Supplies */}
            {itemExpenses.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-slate-700">Daily Kitchen &amp; Supply Purchases</h3>
                <table className="mt-1.5 w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500">
                      <th className="pb-1 font-medium">Item / Supply</th>
                      <th className="pb-1 font-medium">Category</th>
                      <th className="pb-1 text-center font-medium">Quantity</th>
                      <th className="pb-1 text-right font-medium">Unit Price</th>
                      <th className="pb-1 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="py-1 font-medium text-slate-900">{exp.item_name}</td>
                        <td className="py-1 text-slate-600">{exp.category || "Supplies"}</td>
                        <td className="py-1 text-center tabular-nums text-slate-800">
                          {exp.quantity} {exp.unit}
                        </td>
                        <td className="py-1 text-right tabular-nums text-slate-600">
                          {exp.unit_price ? formatMoney(exp.unit_price) : "-"}
                        </td>
                        <td className="py-1 text-right font-bold tabular-nums text-slate-900">
                          {formatMoney(exp.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Miscellaneous */}
            {miscExpenses.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-slate-700">Miscellaneous &amp; Petty Cash</h3>
                <table className="mt-1.5 w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500">
                      <th className="pb-1 font-medium">Description</th>
                      <th className="pb-1 font-medium">Category</th>
                      <th className="pb-1 text-center font-medium">Payment Mode</th>
                      <th className="pb-1 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {miscExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="py-1 font-medium text-slate-900">{exp.title}</td>
                        <td className="py-1 text-slate-600">{exp.category || "General"}</td>
                        <td className="py-1 text-center uppercase text-slate-500">{exp.payment_method}</td>
                        <td className="py-1 text-right font-bold tabular-nums text-slate-900">
                          {formatMoney(exp.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Section 4: Top Selling Dishes */}
        {items.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              {singleDay ? (rawExpenses.length > 0 ? "3" : "2") : (rawExpenses.length > 0 ? "4" : "3")}. Top Dishes Sold ({items.length} items)
            </h2>
            <table className="mt-2 w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500">
                  <th className="pb-1 font-medium">Dish Name</th>
                  <th className="pb-1 text-center font-medium">Qty Sold</th>
                  <th className="pb-1 text-right font-medium">Total Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.slice(0, 15).map((item) => (
                  <tr key={item.itemName}>
                    <td className="py-1 font-medium text-slate-900">{item.itemName}</td>
                    <td className="py-1 text-center font-bold tabular-nums text-slate-800">
                      {item.qty}
                    </td>
                    <td className="py-1 text-right font-semibold tabular-nums text-slate-900">
                      {formatMoney(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Signatures & Verification */}
        <footer className="mt-10 border-t-2 border-slate-300 pt-6">
          <div className="grid grid-cols-2 gap-8 text-xs text-slate-600 sm:grid-cols-3">
            <div>
              <p className="font-semibold text-slate-800">Cashier / Prepared By:</p>
              <div className="mt-8 border-b border-slate-400" />
              <p className="mt-1 text-[11px] text-slate-500">Signature</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Manager / Verified By:</p>
              <div className="mt-8 border-b border-slate-400" />
              <p className="mt-1 text-[11px] text-slate-500">Signature</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="font-semibold text-slate-800">Owner Approval &amp; Stamp:</p>
              <div className="mt-8 border-b border-slate-400" />
              <p className="mt-1 text-[11px] text-slate-500">Seal / Stamp</p>
            </div>
          </div>
          <p className="mt-6 text-center text-[10px] text-slate-400">
            Minar Sea Food POS System · Official Business Day Financial Record
          </p>
        </footer>
      </div>
    </div>
  );
}
