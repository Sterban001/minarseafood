import { formatDateTime } from "@/shared/lib/dates";
import { toCsv, type CsvColumn } from "@/shared/lib/csv";

import {
  getBills,
  getDailySales,
  getItemSales,
  getTableTurnover,
  getVoids,
  getWaiterSales,
  rollUpCategories,
  type BillRow,
  type CategoryRow,
  type DailyPoint,
  type DateRange,
  type ItemRow,
  type TableRow,
  type VoidRow,
  type WaiterRow,
} from "./queries";

export type ReportName =
  | "daily"
  | "waiters"
  | "items"
  | "categories"
  | "tables"
  | "bills"
  | "voids";

const reportNames: ReportName[] = [
  "daily",
  "waiters",
  "items",
  "categories",
  "tables",
  "bills",
  "voids",
];

export function isReportName(value: string | null | undefined): value is ReportName {
  return reportNames.includes(value as ReportName);
}

/**
 * Amounts stay as bare numbers so the columns add up in a spreadsheet — the
 * owner's accountant gets these files, not a screenshot of the dashboard.
 */
const daily: CsvColumn<DailyPoint>[] = [
  { header: "Sales date", value: (row) => row.date },
  { header: "Bills", value: (row) => row.orders },
  { header: "Covers", value: (row) => row.covers },
  { header: "Gross", value: (row) => row.gross },
  { header: "Discount", value: (row) => row.discount },
  { header: "Net", value: (row) => row.net },
  { header: "Average ticket", value: (row) => row.avgTicket },
  { header: "Cash", value: (row) => row.cash },
  { header: "Card", value: (row) => row.card },
  { header: "UPI", value: (row) => row.upi },
  { header: "Voided items", value: (row) => row.voidedItems },
  { header: "Voided value", value: (row) => row.voidedValue },
  { header: "Cancelled bills", value: (row) => row.cancelledOrders },
];

const waiters: CsvColumn<WaiterRow>[] = [
  { header: "Waiter", value: (row) => row.waiterName },
  { header: "Bills", value: (row) => row.orders },
  { header: "Covers", value: (row) => row.covers },
  { header: "Items", value: (row) => row.items },
  { header: "Gross", value: (row) => row.gross },
  { header: "Discount", value: (row) => row.discount },
  { header: "Net", value: (row) => row.net },
  { header: "Average ticket", value: (row) => row.avgTicket },
];

const items: CsvColumn<ItemRow>[] = [
  { header: "Dish", value: (row) => row.itemName },
  { header: "Section", value: (row) => row.categoryName },
  { header: "Quantity", value: (row) => row.qty },
  { header: "Gross", value: (row) => row.gross },
];

const categories: CsvColumn<CategoryRow>[] = [
  { header: "Section", value: (row) => row.categoryName },
  { header: "Quantity", value: (row) => row.qty },
  { header: "Gross", value: (row) => row.gross },
];

const tables: CsvColumn<TableRow>[] = [
  { header: "Table", value: (row) => row.tableLabel },
  { header: "Bills", value: (row) => row.orders },
  { header: "Covers", value: (row) => row.covers },
  { header: "Net", value: (row) => row.net },
  { header: "Average minutes", value: (row) => row.avgMinutes },
];

const bills: CsvColumn<BillRow>[] = [
  { header: "Sales date", value: (row) => row.businessDate },
  { header: "Bill no", value: (row) => row.orderNo },
  { header: "Table", value: (row) => row.tableLabel },
  { header: "Waiter", value: (row) => row.waiterName },
  { header: "Status", value: (row) => row.status },
  { header: "Guests", value: (row) => row.guestCount },
  { header: "Subtotal", value: (row) => row.subtotal },
  { header: "Discount", value: (row) => row.discount },
  { header: "Discount reason", value: (row) => row.discountReason },
  { header: "Total", value: (row) => row.total },
  { header: "Payment", value: (row) => row.paymentMethod },
  { header: "Opened", value: (row) => formatDateTime(row.openedAt) },
  { header: "Closed", value: (row) => (row.closedAt ? formatDateTime(row.closedAt) : "") },
  { header: "Closed by", value: (row) => row.closedByName },
  { header: "Cancel reason", value: (row) => row.cancelReason },
];

const voids: CsvColumn<VoidRow>[] = [
  { header: "Sales date", value: (row) => row.businessDate },
  { header: "Bill no", value: (row) => row.orderNo },
  { header: "Dish", value: (row) => row.itemName },
  { header: "Quantity", value: (row) => row.qty },
  { header: "Value", value: (row) => row.value },
  { header: "Reason", value: (row) => row.reason },
  { header: "Voided by", value: (row) => row.voidedByName },
  { header: "Punched by", value: (row) => row.addedByName },
  { header: "Voided at", value: (row) => formatDateTime(row.voidedAt) },
];

/** Fetches one report and renders it as a CSV body plus a filename. */
export async function buildCsvReport(
  report: ReportName,
  range: DateRange,
): Promise<{ filename: string; body: string }> {
  const span = range.from === range.to ? range.from : `${range.from}_to_${range.to}`;
  const filename = `minar-${report}-${span}.csv`;

  switch (report) {
    case "daily":
      return { filename, body: toCsv(await getDailySales(range), daily) };
    case "waiters":
      return { filename, body: toCsv(await getWaiterSales(range), waiters) };
    case "items":
      return { filename, body: toCsv(await getItemSales(range), items) };
    case "categories":
      return {
        filename,
        body: toCsv(rollUpCategories(await getItemSales(range)), categories),
      };
    case "tables":
      return { filename, body: toCsv(await getTableTurnover(range), tables) };
    case "bills":
      return { filename, body: toCsv(await getBills(range), bills) };
    case "voids":
      return { filename, body: toCsv(await getVoids(range), voids) };
  }
}
