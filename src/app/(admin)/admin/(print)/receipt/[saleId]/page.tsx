import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PrintButton } from "@/modules/admin/sales/components/print-button";
import { getSaleDetail } from "@/modules/admin/sales/queries";
import { fullAddress, restaurant } from "@/shared/config/restaurant";
import { formatBusinessDate, formatTime } from "@/shared/lib/dates";
import { formatAmount, formatMoney } from "@/shared/lib/money";

export const metadata: Metadata = { title: "Receipt" };

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;
  const detail = await getSaleDetail(saleId);
  if (!detail) notFound();

  const { sale, items } = detail;

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
        <PrintButton />
      </div>

      <div className="print-sheet rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="text-center">
          <h1 className="font-display text-xl font-semibold tracking-wide text-slate-900">
            {restaurant.displayName}
          </h1>
          <p className="mt-1 text-[0.7rem] leading-snug text-slate-500">{fullAddress}</p>
          <p className="text-[0.7rem] text-slate-500">{restaurant.phone}</p>
        </header>

        <div className="mt-4 border-y border-dashed border-slate-300 py-2 text-[0.72rem] text-slate-700">
          <Line label="Sale no." value={`#${sale.sale_no}`} />
          <Line label="Sales day" value={formatBusinessDate(sale.business_date)} />
          <Line label="Time" value={formatTime(sale.created_at)} />
          <Line label="Payment" value="CASH" />
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
                <td className="py-1.5 pr-2">{item.item_name}</td>
                <td className="py-1.5 text-center tabular-nums">{item.qty}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatAmount(item.item_price)}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatAmount(item.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 space-y-1 border-t border-dashed border-slate-300 pt-2 text-[0.78rem]">
          <div className="mt-1 flex items-baseline justify-between border-t border-slate-300 pt-1.5 text-base font-semibold text-slate-900">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(sale.total)}</span>
          </div>
        </div>

        <p className="mt-4 border-t border-dashed border-slate-300 pt-3 text-center text-[0.7rem] font-medium text-slate-600">
          Paid — thank you
        </p>
        <p className="mt-1 text-center text-[0.7rem] text-slate-500">
          Thank you — please come again.
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
