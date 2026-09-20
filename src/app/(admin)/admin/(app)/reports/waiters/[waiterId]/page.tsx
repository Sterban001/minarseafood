import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireManager, roleLabels } from "@/modules/admin/auth/session";
import { BillsTable } from "@/modules/admin/reports/components/bills-table";
import { RangePicker } from "@/modules/admin/reports/components/range-picker";
import { BarList, Stat } from "@/modules/admin/reports/components/stat";
import {
  getBills,
  getWaiterItems,
  getWaiterSales,
  type WaiterItemRow,
  type WaiterRow,
} from "@/modules/admin/reports/queries";
import { comparisonLabel, resolveRange } from "@/modules/admin/reports/range";
import { createServerSupabase } from "@/shared/supabase/server";
import { formatBusinessDateShort, formatTime } from "@/shared/lib/dates";
import { formatMoney, round2 } from "@/shared/lib/money";
import { Badge, Card, CardHeader } from "@/shared/ui/surface";
import { DataTable, type Column } from "@/shared/ui/table";

export const metadata: Metadata = { title: "Waiter sales" };

const emptyWaiterRow = (waiterId: string, waiterName: string): WaiterRow => ({
  waiterId,
  waiterName,
  orders: 0,
  covers: 0,
  items: 0,
  gross: 0,
  discount: 0,
  net: 0,
  avgTicket: 0,
});

export default async function WaiterReportPage({
  params,
  searchParams,
}: PageProps<"/admin/reports/waiters/[waiterId]">) {
  await requireManager();
  const { waiterId } = await params;

  const resolved = resolveRange(await searchParams);
  const { range, previous, preset, label } = resolved;

  const supabase = await createServerSupabase();
  const { data: person } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", waiterId)
    .maybeSingle();

  if (!person) notFound();

  const [sales, earlierSales, bills, lines] = await Promise.all([
    getWaiterSales(range),
    getWaiterSales(previous),
    getBills(range, { waiterId }),
    getWaiterItems(range, waiterId),
  ]);

  const mine =
    sales.find((row) => row.waiterId === waiterId) ??
    emptyWaiterRow(waiterId, person.full_name);
  const earlier =
    earlierSales.find((row) => row.waiterId === waiterId) ??
    emptyWaiterRow(waiterId, person.full_name);

  const versus = comparisonLabel(preset);
  const singleDay = range.from === range.to;

  const voided = lines.filter((line) => line.voided);
  const voidedValue = round2(voided.reduce((sum, line) => sum + line.value, 0));
  const punched = lines
    .filter((line) => !line.voided)
    .reduce((sum, line) => sum + line.qty, 0);

  const dishes = rollUpDishes(lines);

  return (
    <>
      <div className="print-hidden mb-4">
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Reports
        </Link>
        <h1 className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xl font-semibold text-slate-900">
          {person.full_name}
          <Badge tone={person.role === "waiter" ? "neutral" : "spice"}>
            {roleLabels[person.role]}
          </Badge>
          {person.is_active ? null : <Badge tone="danger">Switched off</Badge>}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {label} · bills they owned, settled only
        </p>
      </div>

      <RangePicker basePath={`/admin/reports/waiters/${waiterId}`} resolved={resolved} />

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="Net takings"
          value={formatMoney(mine.net)}
          tone="good"
          compare={{ current: mine.net, previous: earlier.net, label: versus }}
        />
        <Stat
          label="Bills"
          value={mine.orders}
          compare={{ current: mine.orders, previous: earlier.orders, label: versus }}
        />
        <Stat
          label="Covers"
          value={mine.covers}
          compare={{ current: mine.covers, previous: earlier.covers, label: versus }}
        />
        <Stat
          label="Average ticket"
          value={formatMoney(mine.avgTicket)}
          compare={{ current: mine.avgTicket, previous: earlier.avgTicket, label: versus }}
        />
        <Stat
          label="Discounts"
          value={formatMoney(mine.discount)}
          hint="a manager has to approve these"
          tone={mine.discount > 0 ? "warn" : "neutral"}
        />
        <Stat
          label="Items punched"
          value={punched}
          hint={
            voided.length > 0
              ? `${voided.length} voided, ${formatMoney(voidedValue)}`
              : "nothing voided"
          }
          tone={voided.length > 0 ? "warn" : "neutral"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <CardHeader
            title="What they sold"
            subtitle="Lines they punched, including on other people's tables"
          />
          <BarList
            rows={dishes.slice(0, 12).map((dish) => ({
              label: dish.itemName,
              value: dish.value,
              display: formatMoney(dish.value),
              meta: `${dish.qty} sold`,
            }))}
            emptyLabel="Nothing punched in this period."
          />
        </Card>

        <Card>
          <CardHeader
            title="Voided lines"
            subtitle="Taken off a bill by a manager after this waiter punched it"
          />
          <DataTable
            rows={voided}
            columns={voidedColumns}
            rowKey={(row) => row.id}
            emptyLabel="No voids against this waiter."
          />
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Bills"
          subtitle={`${bills.length} bills opened under this login in the period`}
        />
        <BillsTable rows={bills} showWaiter={false} showDate={!singleDay} />
      </Card>
    </>
  );
}

type DishRow = { itemName: string; qty: number; value: number };

/** Their own menu mix, best first. Voided lines never count as a sale. */
function rollUpDishes(lines: WaiterItemRow[]): DishRow[] {
  const merged = new Map<string, DishRow>();

  for (const line of lines) {
    if (line.voided) continue;
    const current =
      merged.get(line.itemName) ?? { itemName: line.itemName, qty: 0, value: 0 };
    current.qty += line.qty;
    current.value += line.lineTotal;
    merged.set(line.itemName, current);
  }

  return [...merged.values()]
    .map((row) => ({ ...row, value: round2(row.value) }))
    .sort((a, b) => b.value - a.value);
}

const voidedColumns: Column<WaiterItemRow>[] = [
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
    key: "date",
    header: "Date",
    secondary: true,
    cell: (row) => formatBusinessDateShort(row.businessDate),
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
    key: "punched",
    header: "Punched",
    align: "right",
    secondary: true,
    cell: (row) => formatTime(row.createdAt),
  },
];
