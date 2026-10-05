import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PrintButton } from "@/modules/admin/sales/components/print-button";
import { getTableConsolidatedBill } from "@/modules/admin/sales/queries";
import { fullAddress, restaurant } from "@/shared/config/restaurant";
import { formatBusinessDate, formatTime } from "@/shared/lib/dates";
import { formatAmount, formatMoney } from "@/shared/lib/money";

export const metadata: Metadata = { title: "Table Bill — Consolidated" };

export default async function TableReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ tableId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { tableId } = await params;
  const { date } = await searchParams;

  const bill = await getTableConsolidatedBill(tableId, date);
  if (!bill) notFound();

  const { table, businessDate, salesCount, saleNumbers, items, total, firstSaleTime, lastSaleTime } = bill;

  return (
    <div className="mx-auto max-w-sm px-4 print:max-w-none print:px-0">
      <div className="print-hidden mb-4 flex items-center justify-between gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to sales
        </Link>
        <div className="flex items-center gap-2">
          {bill.isUnbilled ? (
            <form
              action={async () => {
                "use server";
                const { settleTableBill } = await import("@/modules/admin/sales/actions");
                await settleTableBill(tableId);
              }}
            >
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
              >
                Mark Settled (Clear Green)
              </button>
            </form>
          ) : (
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              ✓ Settled
            </span>
          )}
          <PrintButton autoPrint />
        </div>
      </div>

      <div className="print-sheet rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="text-center">
          <h1 className="font-display text-xl font-semibold tracking-wide text-slate-900">
            {restaurant.displayName}
          </h1>
          <p className="mt-1 text-[0.7rem] leading-snug text-slate-500">{fullAddress}</p>
          <p className="text-[0.7rem] text-slate-500">{restaurant.phone}</p>
          <div className="mt-2 inline-block rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-800 uppercase tracking-wide">
            Table {table.label} — Consolidated Bill
          </div>
        </header>

        <div className="mt-3 border-y border-dashed border-slate-300 py-2 text-[0.72rem] text-slate-700">
          <Line label="Table" value={`${table.label} (${table.zone})`} />
          <Line label="Sales Date" value={formatBusinessDate(businessDate)} />
          {salesCount > 0 ? (
            <>
              <Line label="Orders Count" value={`${salesCount} orders`} />
              <Line label="Receipt #s" value={`#${saleNumbers.join(", #")}`} />
              {firstSaleTime ? (
                <Line
                  label="Session"
                  value={`${formatTime(firstSaleTime)} - ${formatTime(lastSaleTime)}`}
                />
              ) : null}
            </>
          ) : (
            <Line label="Status" value="No orders placed today" />
          )}
        </div>

        {items.length === 0 ? (
          <div className="my-6 text-center text-xs text-slate-500">
            No items have been ordered for Table {table.label} today.
          </div>
        ) : (
          <>
            <table className="mt-3 w-full text-[0.75rem]">
              <thead>
                <tr className="border-b border-slate-300 text-left text-slate-500">
                  <th className="pb-1 font-medium">Item</th>
                  <th className="pb-1 text-center font-medium">Qty</th>
                  <th className="pb-1 text-right font-medium">Rate</th>
                  <th className="pb-1 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={`${item.itemName}-${idx}`} className="align-top">
                    <td className="py-1.5 pr-2 font-medium text-slate-800">{item.itemName}</td>
                    <td className="py-1.5 text-center tabular-nums">{item.qty}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {formatAmount(item.itemPrice)}
                    </td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">
                      {formatAmount(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 space-y-1 border-t border-dashed border-slate-300 pt-2 text-[0.78rem]">
              <div className="mt-1 flex items-baseline justify-between border-t border-slate-300 pt-1.5 text-base font-bold text-slate-900">
                <span>Grand Total</span>
                <span className="tabular-nums">{formatMoney(total)}</span>
              </div>
            </div>

            <p className="mt-4 border-t border-dashed border-slate-300 pt-3 text-center text-[0.72rem] font-bold text-slate-700 uppercase tracking-wider">
              Paid — Thank You
            </p>
            <p className="mt-1 text-center text-[0.7rem] text-slate-500">
              Please visit us again!
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
