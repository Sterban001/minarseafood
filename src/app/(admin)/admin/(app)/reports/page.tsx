import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/modules/admin/components/admin-shell";
import { requireManager } from "@/modules/admin/auth/session";
import { BillsTable } from "@/modules/admin/reports/components/bills-table";
import { CsvLink, RangePicker } from "@/modules/admin/reports/components/range-picker";
import { BarList, ColumnChart, Stat } from "@/modules/admin/reports/components/stat";
import {
  getBills,
  getDailySales,
  getHourlySales,
  getItemSales,
  getTableTurnover,
  getVoids,
  getWaiterSales,
  rollUpCategories,
  sumTotals,
  type BillRow,
  type DateRange,
  type VoidRow,
  type WaiterRow,
} from "@/modules/admin/reports/queries";
import { comparisonLabel, rangeQuery, resolveRange } from "@/modules/admin/reports/range";
import {
  formatBusinessDateShort,
  formatHourLabel,
  formatTime,
  todayBusinessDate,
} from "@/shared/lib/dates";
import { formatMoney, percentOf } from "@/shared/lib/money";
import { Card, CardHeader } from "@/shared/ui/surface";
import { DataTable, type Column } from "@/shared/ui/table";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireManager();

  const resolved = resolveRange(await searchParams);
  const { range, previous, preset, label } = resolved;

  const [daily, earlierDaily, waiters, items, hours, tables, bills, voids] =
    await Promise.all([
      getDailySales(range),
      getDailySales(previous),
      getWaiterSales(range),
      getItemSales(range),
      getHourlySales(range),
      getTableTurnover(range),
      getBills(range),
      getVoids(range),
    ]);

  const totals = sumTotals(daily);
  const earlier = sumTotals(earlierDaily);
  const categories = rollUpCategories(items);
  const versus = comparisonLabel(preset);
  const singleDay = range.from === range.to;
  const today = todayBusinessDate();

  const discounted = bills.filter((bill) => bill.discount > 0).slice(0, 25);
  const payments = [
    { label: "Cash", value: totals.cash },
    { label: "Card", value: totals.card },
    { label: "UPI", value: totals.upi },
  ].filter((row) => row.value > 0);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`${label} · settled bills only, so a table still running is not counted yet`}
      />

      <RangePicker basePath="/admin/reports" resolved={resolved} />

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="Gross"
          value={formatMoney(totals.gross)}
          hint="before discounts"
          compare={{ current: totals.gross, previous: earlier.gross, label: versus }}
        />
        <Stat
          label="Discounts"
          value={formatMoney(totals.discount)}
          hint={
            totals.gross > 0
              ? `${percentOf(totals.discount, totals.gross)}% of gross`
              : undefined
          }
          tone={totals.discount > 0 ? "warn" : "neutral"}
          compare={{ current: totals.discount, previous: earlier.discount, label: versus }}
        />
        <Stat
          label="Net takings"
          value={formatMoney(totals.net)}
          tone="good"
          compare={{ current: totals.net, previous: earlier.net, label: versus }}
        />
        <Stat
          label="Bills"
          value={totals.orders}
          hint={
            totals.cancelledOrders > 0
              ? `${totals.cancelledOrders} cancelled as well`
              : undefined
          }
          compare={{ current: totals.orders, previous: earlier.orders, label: versus }}
        />
        <Stat
          label="Covers"
          value={totals.covers}
          hint={
            totals.covers > 0
              ? `${formatMoney(totals.net / totals.covers)} a head`
              : undefined
          }
          compare={{ current: totals.covers, previous: earlier.covers, label: versus }}
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
              title="Net takings by day"
              subtitle="Each bar is one sales day, 5am to 5am"
              action={<CsvLink report="daily" range={range} />}
            />
            <ColumnChart
              rows={daily.map((point) => ({
                label: formatBusinessDateShort(point.date),
                value: point.net,
                display: formatMoney(point.net),
                highlight: point.date === today,
              }))}
            />
          </Card>
        )}

        <Card>
          <CardHeader
            title="When the money came in"
            subtitle="By the hour a bill was settled"
          />
          <ColumnChart
            rows={hours.map((row) => ({
              label: formatHourLabel(row.hour),
              value: row.net,
              display: `${formatMoney(row.net)} · ${row.orders} bills`,
            }))}
            emptyLabel="No bills have been settled in this period."
          />
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Waiters"
          subtitle="Tap a name for that waiter's bills and dishes"
          action={<CsvLink report="waiters" range={range} />}
        />
        <DataTable
          rows={waiters}
          columns={waiterColumns(range)}
          rowKey={(row) => row.waiterId ?? "unassigned"}
          emptyLabel="Nobody has settled a bill in this period."
        />
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Best sellers"
            subtitle={`Top ${Math.min(items.length, 12)} of ${items.length} dishes sold`}
            action={<CsvLink report="items" range={range} />}
          />
          <BarList
            rows={items.slice(0, 12).map((item) => ({
              label: item.itemName,
              value: item.gross,
              display: formatMoney(item.gross),
              meta: `${item.qty} sold`,
            }))}
            emptyLabel="No dishes sold in this period."
          />
        </Card>

        <Card>
          <CardHeader
            title="Sections"
            subtitle="Where the menu actually earns"
            action={<CsvLink report="categories" range={range} />}
          />
          <BarList
            rows={categories.map((category) => ({
              label: category.categoryName,
              value: category.gross,
              display: formatMoney(category.gross),
              meta: `${category.qty} sold`,
            }))}
            emptyLabel="No dishes sold in this period."
          />
        </Card>

        <Card>
          <CardHeader title="Paid by" subtitle="Split across the settled bills" />
          <BarList
            tone="spice"
            rows={payments.map((row) => ({
              label: row.label,
              value: row.value,
              display: formatMoney(row.value),
              meta: `${percentOf(row.value, totals.net)}%`,
            }))}
            emptyLabel="Nothing settled yet."
          />
        </Card>

        <Card>
          <CardHeader
            title="Tables"
            subtitle="Takings and how long a party sat"
            action={<CsvLink report="tables" range={range} />}
          />
          <BarList
            rows={tables.map((table) => ({
              label: table.tableLabel,
              value: table.net,
              display: formatMoney(table.net),
              meta: `${Math.round(table.avgMinutes)} min avg`,
            }))}
            emptyLabel="No tables turned over in this period."
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Voided items"
            subtitle={
              totals.voidedItems > 0
                ? `${totals.voidedItems} lines worth ${formatMoney(totals.voidedValue)}`
                : "Nothing was taken off a bill"
            }
            action={<CsvLink report="voids" range={range} />}
          />
          <DataTable
            rows={voids}
            columns={voidColumns}
            rowKey={(row) => row.id}
            emptyLabel="No voids in this period."
          />
        </Card>

        <Card>
          <CardHeader
            title="Discounted bills"
            subtitle={
              totals.discount > 0
                ? `${formatMoney(totals.discount)} taken off settled bills`
                : "No discounts given"
            }
          />
          <DataTable
            rows={discounted}
            columns={discountColumns}
            rowKey={(row) => row.id}
            emptyLabel="No discounts in this period."
          />
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Bills"
          subtitle="Every bill opened in this period, settled or not"
          action={<CsvLink report="bills" range={range} label="CSV (all bills)" />}
        />
        <BillsTable rows={bills.slice(0, 50)} showDate={!singleDay} />
        {bills.length > 50 ? (
          <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
            Showing the 50 most recent. Download the CSV for every bill in the period.
          </p>
        ) : null}
      </Card>
    </>
  );
}

function waiterColumns(range: DateRange): Column<WaiterRow>[] {
  return [
    {
      key: "name",
      header: "Waiter",
      cell: (row) =>
        row.waiterId ? (
          <Link
            href={`/admin/reports/waiters/${row.waiterId}${rangeQuery(range)}`}
            className="font-medium text-brand-700 hover:text-brand-900"
          >
            {row.waiterName}
          </Link>
        ) : (
          <span className="font-medium text-slate-900">{row.waiterName}</span>
        ),
    },
    { key: "orders", header: "Bills", align: "right", cell: (row) => row.orders },
    {
      key: "covers",
      header: "Covers",
      align: "right",
      secondary: true,
      cell: (row) => row.covers,
    },
    {
      key: "items",
      header: "Items",
      align: "right",
      secondary: true,
      cell: (row) => row.items,
    },
    {
      key: "gross",
      header: "Gross",
      align: "right",
      secondary: true,
      cell: (row) => formatMoney(row.gross),
    },
    {
      key: "discount",
      header: "Discount",
      align: "right",
      secondary: true,
      cell: (row) =>
        row.discount > 0 ? (
          <span className="text-amber-700">{formatMoney(row.discount)}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: "net",
      header: "Net",
      align: "right",
      cell: (row) => (
        <span className="font-semibold text-slate-900">{formatMoney(row.net)}</span>
      ),
    },
    {
      key: "avg",
      header: "Avg ticket",
      align: "right",
      secondary: true,
      cell: (row) => formatMoney(row.avgTicket),
    },
  ];
}

const voidColumns: Column<VoidRow>[] = [
  {
    key: "bill",
    header: "Bill",
    cell: (row) => (
      <Link
        href={`/admin/orders/${row.orderId}`}
        className="font-medium text-brand-700 hover:text-brand-900"
      >
        #{row.orderNo}
      </Link>
    ),
  },
  {
    key: "item",
    header: "Dish",
    cell: (row) => (
      <span className="font-medium text-slate-900">
        {row.qty > 1 ? `${row.qty} × ` : ""}
        {row.itemName}
      </span>
    ),
  },
  {
    key: "value",
    header: "Value",
    align: "right",
    cell: (row) => formatMoney(row.value),
  },
  {
    key: "reason",
    header: "Reason",
    cell: (row) => row.reason ?? <span className="text-slate-400">not given</span>,
  },
  {
    key: "by",
    header: "Voided by",
    secondary: true,
    cell: (row) => row.voidedByName ?? "—",
  },
  {
    key: "at",
    header: "At",
    align: "right",
    secondary: true,
    cell: (row) => formatTime(row.voidedAt),
  },
];

const discountColumns: Column<BillRow>[] = [
  {
    key: "bill",
    header: "Bill",
    cell: (row) => (
      <Link
        href={`/admin/orders/${row.id}`}
        className="font-medium text-brand-700 hover:text-brand-900"
      >
        #{row.orderNo}
      </Link>
    ),
  },
  {
    key: "table",
    header: "Table",
    cell: (row) => <span className="font-medium text-slate-900">{row.tableLabel}</span>,
  },
  { key: "waiter", header: "Waiter", secondary: true, cell: (row) => row.waiterName },
  {
    key: "discount",
    header: "Discount",
    align: "right",
    cell: (row) => (
      <span className="font-semibold text-amber-700">{formatMoney(row.discount)}</span>
    ),
  },
  {
    key: "reason",
    header: "Reason",
    cell: (row) => row.discountReason ?? <span className="text-slate-400">not given</span>,
  },
  {
    key: "total",
    header: "Total",
    align: "right",
    secondary: true,
    cell: (row) => formatMoney(row.total),
  },
];
