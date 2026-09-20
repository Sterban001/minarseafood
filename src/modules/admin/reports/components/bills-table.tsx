import Link from "next/link";

import { formatBusinessDateShort, formatTime } from "@/shared/lib/dates";
import { formatMoney } from "@/shared/lib/money";
import type { OrderStatus, PaymentMethod } from "@/shared/types/database";
import { Badge } from "@/shared/ui/surface";
import { DataTable, type Column } from "@/shared/ui/table";

import type { BillRow } from "../queries";

const statusLabels: Record<OrderStatus, string> = {
  open: "Open",
  billed: "Billed",
  paid: "Paid",
  cancelled: "Cancelled",
};

const statusTones: Record<OrderStatus, "brand" | "spice" | "success" | "danger"> = {
  open: "brand",
  billed: "spice",
  paid: "success",
  cancelled: "danger",
};

export const paymentLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
};

export function BillStatus({ status }: { status: OrderStatus }) {
  return <Badge tone={statusTones[status]}>{statusLabels[status]}</Badge>;
}

/**
 * The list behind every summary figure on the reports screens. The bill number
 * links to the order itself, which is still readable after settlement.
 */
export function BillsTable({
  rows,
  showDate = true,
  showWaiter = true,
}: {
  rows: BillRow[];
  /** Pointless on a single-day range. */
  showDate?: boolean;
  /** Pointless on a per-waiter page. */
  showWaiter?: boolean;
}) {
  const columns: Column<BillRow>[] = [
    {
      key: "no",
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
  ];

  if (showDate) {
    columns.push({
      key: "date",
      header: "Date",
      secondary: true,
      cell: (row) => formatBusinessDateShort(row.businessDate),
    });
  }

  columns.push({
    key: "table",
    header: "Table",
    cell: (row) => <span className="font-medium text-slate-900">{row.tableLabel}</span>,
  });

  if (showWaiter) {
    columns.push({ key: "waiter", header: "Waiter", cell: (row) => row.waiterName });
  }

  columns.push(
    {
      key: "guests",
      header: "Guests",
      align: "right",
      secondary: true,
      cell: (row) => row.guestCount,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <BillStatus status={row.status} />,
    },
    {
      key: "discount",
      header: "Discount",
      align: "right",
      secondary: true,
      cell: (row) =>
        row.discount > 0 ? (
          <span className="text-amber-700" title={row.discountReason ?? undefined}>
            {formatMoney(row.discount)}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (row) => (
        <span className="font-semibold text-slate-900">{formatMoney(row.total)}</span>
      ),
    },
    {
      key: "payment",
      header: "Paid by",
      secondary: true,
      cell: (row) => (row.paymentMethod ? paymentLabels[row.paymentMethod] : "—"),
    },
    {
      key: "closed",
      header: "Closed",
      align: "right",
      secondary: true,
      cell: (row) => formatTime(row.closedAt),
    },
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      emptyLabel="No bills in this period."
    />
  );
}
