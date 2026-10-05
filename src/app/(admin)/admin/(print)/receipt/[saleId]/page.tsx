import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PrintButton } from "@/modules/admin/sales/components/print-button";
import { getSaleDetail } from "@/modules/admin/sales/queries";
import { formatBusinessDate, formatTime } from "@/shared/lib/dates";
import { formatAmount, formatMoney } from "@/shared/lib/money";

export const metadata: Metadata = { title: "Staff Receipt" };

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
    <div className="mx-auto max-w-xs px-4 print:max-w-none print:px-0">
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

      <div className="print-sheet rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="border-b border-dashed border-slate-300 pb-2 text-center">
          <div className="text-2xl font-black tracking-tight text-slate-900 uppercase">
            {sale.table_label ? `TABLE ${sale.table_label}` : "🛍️ TAKEAWAY"}
          </div>
          <div className="mt-1 text-sm font-bold text-slate-700">
            Sale #{sale.sale_no}
          </div>
        </header>

        <div className="mt-2 border-b border-dashed border-slate-300 pb-2 text-[0.72rem] text-slate-700 space-y-0.5">
          <Line label="Date" value={formatBusinessDate(sale.business_date)} />
          <Line label="Time" value={formatTime(sale.created_at)} />
        </div>

        <table className="mt-3 w-full text-[0.78rem]">
          <thead>
            <tr className="border-b border-slate-300 text-left text-slate-500">
              <th className="pb-1 font-medium">Item</th>
              <th className="pb-1 text-center font-medium">Qty</th>
              <th className="pb-1 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="py-1.5 pr-2 font-medium text-slate-900">{item.item_name}</td>
                <td className="py-1.5 text-center font-bold tabular-nums text-slate-900">
                  {item.qty}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatAmount(item.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 border-t border-slate-300 pt-2 text-[0.85rem]">
          <div className="flex items-baseline justify-between font-bold text-slate-900">
            <span>Total</span>
            <span className="tabular-nums text-base">{formatMoney(sale.total)}</span>
          </div>
        </div>
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

