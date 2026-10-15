import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Banknote, Boxes, Printer, ReceiptIndianRupee, ReceiptText, Wallet } from "lucide-react";

import { PageHeader } from "@/modules/admin/components/admin-shell";
import { RangePicker } from "@/modules/admin/reports/components/range-picker";
import { BarList, ColumnChart, Stat } from "@/modules/admin/reports/components/stat";
import {
  getCounterDailySales,
  getCounterHourlySales,
  getCounterItemSales,
  getExpensesReport,
  sumCounterTotals,
} from "@/modules/admin/reports/queries";
import { comparisonLabel, resolveRange } from "@/modules/admin/reports/range";
import {
  formatBusinessDateShort,
  formatHourLabel,
  todayBusinessDate,
} from "@/shared/lib/dates";
import { formatAmount, formatMoney, percentOf } from "@/shared/lib/money";
import { Card, CardHeader } from "@/shared/ui/surface";

export const metadata: Metadata = { title: "Reports — Minar Sea Food" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = resolveRange(await searchParams);
  const { range, previous, preset, label } = resolved;

  const [daily, earlierDaily, items, hours, expenses, earlierExpenses] = await Promise.all([
    getCounterDailySales(range),
    getCounterDailySales(previous),
    getCounterItemSales(range, { includeUnsold: true }),
    getCounterHourlySales(range),
    getExpensesReport(range),
    getExpensesReport(previous),
  ]);

  const soldItems = items.filter((item) => item.qty > 0);
  const unsoldItems = items.filter((item) => item.qty === 0);

  const totals = sumCounterTotals(daily);
  const earlier = sumCounterTotals(earlierDaily);
  const versus = comparisonLabel(preset);
  const singleDay = range.from === range.to;
  const today = todayBusinessDate();

  const expTotal = expenses.totals.grandTotal;
  const earlierExpTotal = earlierExpenses.totals.grandTotal;

  const netProfit = totals.revenue - expTotal;
  const earlierNetProfit = earlier.revenue - earlierExpTotal;
  const marginPercent = totals.revenue > 0 ? percentOf(netProfit, totals.revenue) : 0;

  const printUrl = `/admin/daily-report?from=${range.from}&to=${range.to}${preset ? `&preset=${preset}` : ""}`;

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`${label} · revenue, expenses & profit`}
        actions={
          <Link
            href={printUrl}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-brand-800"
          >
            <Printer className="size-3.5" />
            <span>Print Report</span>
          </Link>
        }
      />

      <RangePicker basePath="/admin/reports" resolved={resolved} />

      {/* Top Level Financial Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          label="Gross Sales"
          value={formatMoney(totals.revenue)}
          tone="good"
          hint={`${totals.sales} orders placed`}
          compare={{ current: totals.revenue, previous: earlier.revenue, label: versus }}
        />
        <Stat
          label="Expenses Deducted"
          value={`-${formatMoney(expTotal)}`}
          tone="warn"
          hint={`Salaries ${formatMoney(expenses.totals.salariesTotal)} · Items ${formatMoney(expenses.totals.itemsTotal)}`}
          compare={{ current: expTotal, previous: earlierExpTotal, label: versus }}
        />
        <Stat
          label={singleDay ? "Net Daily Total Sale" : "Net Total Sale"}
          value={formatMoney(netProfit)}
          tone={netProfit >= 0 ? "good" : "danger"}
          hint={`Sales minus expenses · ${marginPercent}% margin`}
          compare={{ current: netProfit, previous: earlierNetProfit, label: versus }}
        />
        <Stat
          label="Sales (Tickets)"
          value={totals.sales}
          compare={{ current: totals.sales, previous: earlier.sales, label: versus }}
        />
        <Stat
          label="Average ticket"
          value={formatMoney(totals.avgTicket)}
          compare={{
            current: totals.avgTicket,
            previous: earlier.avgTicket,
            label: versus,
          }}
        />
      </div>

      {/* Profit & Loss Overview Banner */}
      <Card className="mt-4 border-l-4 border-l-brand-600 bg-linear-to-r from-slate-50 to-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">
                P&amp;L Financial Summary ({label})
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Gross counter sales minus daily staff wages, raw food supplies, and petty expenses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:gap-5">
            <div>
              <span className="block text-slate-400">Gross Sales</span>
              <span className="font-bold text-emerald-700">+{formatMoney(totals.revenue)}</span>
            </div>
            <div>
              <span className="block text-slate-400">Staff Salaries</span>
              <span className="font-semibold text-slate-700">
                -{formatMoney(expenses.totals.salariesTotal)}
              </span>
            </div>
            <div>
              <span className="block text-slate-400">Daily Supplies</span>
              <span className="font-semibold text-slate-700">
                -{formatMoney(expenses.totals.itemsTotal)}
              </span>
            </div>
            <div>
              <span className="block text-slate-400">Miscellaneous</span>
              <span className="font-semibold text-slate-700">
                -{formatMoney(expenses.totals.othersTotal)}
              </span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium">Total Deducted</span>
              <span className="font-bold text-red-600">
                -{formatMoney(expTotal)}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
              <span className="block text-[11px] font-medium text-slate-500">Net Total Sale</span>
              <span
                className={`text-sm font-extrabold ${netProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}
              >
                {formatMoney(netProfit)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={printUrl}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <Printer className="size-3.5 text-slate-600" />
              <span>Print Report</span>
            </Link>
            <Link
              href="/admin/expenses"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 transition-colors hover:text-brand-900"
            >
              <span>Manage Expenses</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </Card>

      {/* Charts Grid */}
      <div
        className={
          singleDay ? "mt-4" : "mt-4 grid gap-4 lg:grid-cols-2"
        }
      >
        {singleDay ? null : (
          <Card>
            <CardHeader
              title="Revenue by day"
              subtitle="Sales daily breakdown across the period"
            />
            <ColumnChart
              rows={daily.map((point) => ({
                label: formatBusinessDateShort(point.date),
                value: point.revenue,
                display: formatMoney(point.revenue),
                highlight: point.date === today,
              }))}
            />
          </Card>
        )}

        {singleDay ? null : (
          <Card>
            <CardHeader
              title="Expenses by day"
              subtitle="Daily total expenses across the period"
            />
            <ColumnChart
              rows={expenses.daily.map((point) => ({
                label: formatBusinessDateShort(point.date),
                value: point.grandTotal,
                display: formatMoney(point.grandTotal),
                highlight: point.date === today,
              }))}
              emptyLabel="No expenses recorded in this period."
            />
          </Card>
        )}

        <Card className={singleDay ? "" : "lg:col-span-2"}>
          <CardHeader
            title="Sales by hour"
            subtitle="When the money came in"
          />
          <ColumnChart
            rows={hours.map((row) => ({
              label: formatHourLabel(row.hour),
              value: row.revenue,
              display: `${formatMoney(row.revenue)} · ${row.sales} sales`,
            }))}
            emptyLabel="No sales in this period."
          />
        </Card>
      </div>

      {/* Breakdowns: Best Sellers & Top Expense Categories */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Best sellers"
            subtitle={`Top ${Math.min(soldItems.length, 10)} of ${soldItems.length} dishes sold (${items.length} total menu dishes)`}
          />
          <BarList
            rows={soldItems.slice(0, 10).map((item) => ({
              label: item.itemName,
              value: item.revenue,
              display: formatMoney(item.revenue),
              meta: `${item.qty} sold`,
            }))}
            emptyLabel="No dishes sold in this period."
          />
        </Card>

        <Card>
          <CardHeader
            title="Top expense categories"
            subtitle={`${expenses.categories.length} categories · ${expenses.totals.count} total expense records`}
          />
          <BarList
            tone="spice"
            rows={expenses.categories.map((cat) => ({
              label: cat.category,
              value: cat.amount,
              display: formatMoney(cat.amount),
              meta: `${cat.count} ${cat.count === 1 ? "entry" : "entries"}`,
            }))}
            emptyLabel="No expenses recorded in this period."
          />
        </Card>
      </div>

      {/* Complete Itemized Sales Table (All Dishes) */}
      {items.length > 0 && (
        <Card className="mt-4">
          <CardHeader
            title="Complete Itemized Sales Breakdown"
            subtitle={`All ${items.length} menu dishes · ${soldItems.length} sold with orders · ${unsoldItems.length} unsold in this period`}
            action={
              <Link
                href={printUrl}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
              >
                <Printer className="size-3 text-slate-600" />
                <span>Print All Items Report</span>
              </Link>
            }
          />
          <div className="overflow-x-auto p-4 sm:p-5 pt-0">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-2 w-8 font-semibold text-slate-400">#</th>
                  <th className="py-2.5 pr-4 font-semibold">Dish Name</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Qty Sold</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Orders (Tickets)</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Total Revenue</th>
                  <th className="py-2.5 pl-3 text-right font-semibold">% of Gross Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const pct = totals.revenue > 0 ? percentOf(item.revenue, totals.revenue) : 0;
                  const isUnsold = item.qty === 0;

                  return (
                    <tr
                      key={item.itemName + (item.itemId ?? idx)}
                      className={isUnsold ? "text-slate-400 bg-slate-50/40" : "hover:bg-slate-50/60"}
                    >
                      <td className="py-2.5 pr-2 tabular-nums text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 pr-4 font-medium text-slate-900">
                        {item.itemName}
                        {isUnsold ? (
                          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            No Sales
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-bold text-slate-800">
                        {item.qty}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums text-slate-600">
                        {item.saleCount}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-slate-900">
                        {formatMoney(item.revenue)}
                      </td>
                      <td className="py-2.5 pl-3 text-right tabular-nums font-medium text-slate-600">
                        {pct > 0 ? `${pct}%` : "0%"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 font-bold text-slate-900 bg-slate-50/50">
                <tr>
                  <td colSpan={2} className="py-2.5 pr-4 pl-2 font-bold uppercase text-slate-900">
                    Total All Dishes ({items.length} dishes)
                  </td>
                  <td className="py-2.5 px-3 text-center tabular-nums font-black text-slate-900">
                    {items.reduce((sum, item) => sum + item.qty, 0)}
                  </td>
                  <td className="py-2.5 px-3 text-center tabular-nums text-slate-500">—</td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-black text-emerald-700">
                    {formatMoney(items.reduce((sum, item) => sum + item.revenue, 0))}
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums text-slate-900">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Day-by-Day Reconciliation Table (Multi-day) */}
      {!singleDay && daily.length > 0 && (
        <Card className="mt-4">
          <CardHeader
            title="Daily Sales & Expenses Reconciliation"
            subtitle="Day-by-day cashflow showing expenses cancelled from gross sales"
          />
          <div className="overflow-x-auto p-4 sm:p-5 pt-0">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Business Date</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Orders</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Gross Sales</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Expenses Deducted</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Net Daily Total Sale</th>
                  <th className="py-2.5 pl-3 text-right font-semibold">Net Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daily.map((dayPoint) => {
                  const dayExp = expenses.daily.find((d) => d.date === dayPoint.date);
                  const dayExpTotal = dayExp?.grandTotal ?? 0;
                  const dayNet = dayPoint.revenue - dayExpTotal;
                  const dayMargin = dayPoint.revenue > 0 ? percentOf(dayNet, dayPoint.revenue) : 0;
                  const isCurrentDay = dayPoint.date === today;

                  return (
                    <tr key={dayPoint.date} className={isCurrentDay ? "bg-brand-50/30 font-medium" : ""}>
                      <td className="py-2.5 pr-4 text-slate-900">
                        {formatBusinessDateShort(dayPoint.date)}
                        {isCurrentDay ? (
                          <span className="ml-1.5 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-800">
                            Today
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums text-slate-600">
                        {dayPoint.sales}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-slate-900">
                        {formatMoney(dayPoint.revenue)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-red-600">
                        {dayExpTotal > 0 ? `-${formatMoney(dayExpTotal)}` : "₹0"}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold">
                        <span className={dayNet >= 0 ? "text-emerald-700" : "text-red-600"}>
                          {formatMoney(dayNet)}
                        </span>
                      </td>
                      <td className="py-2.5 pl-3 text-right tabular-nums font-medium text-slate-600">
                        {dayMargin}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
