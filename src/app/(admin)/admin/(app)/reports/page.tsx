import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Banknote, Boxes, ReceiptIndianRupee, ReceiptText, Wallet } from "lucide-react";

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
import { formatMoney, percentOf } from "@/shared/lib/money";
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
    getCounterItemSales(range),
    getCounterHourlySales(range),
    getExpensesReport(range),
    getExpensesReport(previous),
  ]);

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

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`${label} · revenue, expenses & profit`}
      />

      <RangePicker basePath="/admin/reports" resolved={resolved} />

      {/* Top Level Financial Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          label="Revenue"
          value={formatMoney(totals.revenue)}
          tone="good"
          compare={{ current: totals.revenue, previous: earlier.revenue, label: versus }}
        />
        <Stat
          label="Total Expenses"
          value={formatMoney(expTotal)}
          tone="warn"
          hint={`Salaries ${formatMoney(expenses.totals.salariesTotal)} · Items ${formatMoney(expenses.totals.itemsTotal)}`}
          compare={{ current: expTotal, previous: earlierExpTotal, label: versus }}
        />
        <Stat
          label="Net Profit / Balance"
          value={formatMoney(netProfit)}
          tone={netProfit >= 0 ? "good" : "danger"}
          hint={`${marginPercent}% margin on revenue`}
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
              Counter sales cashflow minus staff wages, kitchen supplies, and miscellaneous expenses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:gap-6">
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
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
              <span className="block text-[11px] font-medium text-slate-500">Net Profit</span>
              <span
                className={`text-sm font-extrabold ${netProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}
              >
                {formatMoney(netProfit)}
              </span>
            </div>
          </div>

          <Link
            href="/admin/expenses"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-brand-700 transition-colors hover:text-brand-900"
          >
            <span>Manage Expenses</span>
            <ArrowRight className="size-3.5" />
          </Link>
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
            subtitle={`Top ${Math.min(items.length, 10)} of ${items.length} dishes sold`}
          />
          <BarList
            rows={items.slice(0, 10).map((item) => ({
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
    </>
  );
}
