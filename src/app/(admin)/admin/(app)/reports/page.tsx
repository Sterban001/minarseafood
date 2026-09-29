import type { Metadata } from "next";

import { PageHeader } from "@/modules/admin/components/admin-shell";
import { RangePicker } from "@/modules/admin/reports/components/range-picker";
import { BarList, ColumnChart, Stat } from "@/modules/admin/reports/components/stat";
import {
  getCounterDailySales,
  getCounterHourlySales,
  getCounterItemSales,
  sumCounterTotals,
} from "@/modules/admin/reports/queries";
import { comparisonLabel, resolveRange } from "@/modules/admin/reports/range";
import {
  formatBusinessDateShort,
  formatHourLabel,
  todayBusinessDate,
} from "@/shared/lib/dates";
import { formatMoney } from "@/shared/lib/money";
import { Card, CardHeader } from "@/shared/ui/surface";

export const metadata: Metadata = { title: "Reports — Minar Sea Food" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = resolveRange(await searchParams);
  const { range, previous, preset, label } = resolved;

  const [daily, earlierDaily, items, hours] = await Promise.all([
    getCounterDailySales(range),
    getCounterDailySales(previous),
    getCounterItemSales(range),
    getCounterHourlySales(range),
  ]);

  const totals = sumCounterTotals(daily);
  const earlier = sumCounterTotals(earlierDaily);
  const versus = comparisonLabel(preset);
  const singleDay = range.from === range.to;
  const today = todayBusinessDate();

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`${label} · counter sales`}
      />

      <RangePicker basePath="/admin/reports" resolved={resolved} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Revenue"
          value={formatMoney(totals.revenue)}
          tone="good"
          compare={{ current: totals.revenue, previous: earlier.revenue, label: versus }}
        />
        <Stat
          label="Sales"
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

      <div
        className={
          singleDay ? "mt-4" : "mt-4 grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
        }
      >
        {singleDay ? null : (
          <Card>
            <CardHeader
              title="Revenue by day"
              subtitle="Each bar is one sales day, 5am to 5am"
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

        <Card>
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

      <Card className="mt-4">
        <CardHeader
          title="Best sellers"
          subtitle={`Top ${Math.min(items.length, 15)} of ${items.length} dishes sold`}
        />
        <BarList
          rows={items.slice(0, 15).map((item) => ({
            label: item.itemName,
            value: item.revenue,
            display: formatMoney(item.revenue),
            meta: `${item.qty} sold`,
          }))}
          emptyLabel="No dishes sold in this period."
        />
      </Card>
    </>
  );
}
