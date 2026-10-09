import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PrintButton } from "@/modules/admin/sales/components/print-button";
import { getSaleDetail } from "@/modules/admin/sales/queries";
import { fullAddress, restaurant } from "@/shared/config/restaurant";
import { formatBusinessDate, formatTime } from "@/shared/lib/dates";
import { formatAmount, formatMoney } from "@/shared/lib/money";
import { cn } from "@/shared/ui/cn";

export const metadata: Metadata = { title: "Customer Receipt" };

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;
  const detail = await getSaleDetail(saleId);
  if (!detail) notFound();

  const { sale, items } = detail;
  const isTakeaway =
    !sale.table_label ||
    sale.table_label.toLowerCase().includes("takeaway") ||
    sale.table_label.toLowerCase().startsWith("tk");

  return (
    <div className="mx-auto max-w-sm px-4 print:max-w-none print:px-0">
      <div className="print-hidden mb-4 flex items-center justify-between gap-3">
        <Link
          href="/admin/history"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to history
        </Link>
        <PrintButton autoPrint />
      </div>

      <div className="print-sheet rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="text-center">
          <h1 className="font-display text-xl font-semibold tracking-wide text-slate-900">
            {restaurant.displayName}
          </h1>
          <p className="mt-1 text-[0.7rem] leading-snug text-slate-500">{fullAddress}</p>
          <p className="text-[0.7rem] text-slate-500">{restaurant.phone}</p>
          <div
            className={cn(
              "mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide",
              isTakeaway
                ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                : "bg-brand-50 text-brand-800"
            )}
          >
            {isTakeaway
              ? sale.table_label
                ? `🛍️ ${sale.table_label}`
                : "🛍️ Takeaway"
              : `Table ${sale.table_label}`}
          </div>
          <div className="mt-1 text-sm font-bold text-slate-700">
            Sale #{sale.sale_no}
          </div>
        </header>

        <div className="mt-3 border-y border-dashed border-slate-300 py-2 text-[0.72rem] text-slate-700 space-y-0.5">
          <Line label="Order Type" value={isTakeaway ? "🛍️ Takeaway" : "🍽️ Dine-In Table"} />
          {sale.table_label ? (
            <Line
              label={isTakeaway ? "Takeaway Slot" : "Table"}
              value={sale.table_label}
            />
          ) : null}
          <Line label="Sales Date" value={formatBusinessDate(sale.business_date)} />
          <Line label="Time" value={formatTime(sale.created_at)} />
        </div>

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
            {items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="py-1.5 pr-2 font-medium text-slate-800">{item.item_name}</td>
                <td className="py-1.5 text-center tabular-nums">{item.qty}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatAmount(item.item_price)}
                </td>
                <td className="py-1.5 text-right font-semibold tabular-nums">
                  {formatAmount(item.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 space-y-1 border-t border-dashed border-slate-300 pt-2 text-[0.78rem]">
          <div className="mt-1 flex items-baseline justify-between border-t border-slate-300 pt-1.5 text-base font-bold text-slate-900">
            <span>Grand Total</span>
            <span className="tabular-nums">{formatMoney(sale.total)}</span>
          </div>
        </div>

        <p className="mt-4 border-t border-dashed border-slate-300 pt-3 text-center text-[0.72rem] font-bold text-slate-700 uppercase tracking-wider">
          Paid — Thank You
        </p>
        <p className="mt-1 text-center text-[0.7rem] text-slate-500">
          Please visit us again!
        </p>
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
