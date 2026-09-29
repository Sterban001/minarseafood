"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Printer, ReceiptText } from "lucide-react";

import type { SaleDetail } from "@/modules/admin/sales/queries";
import { formatMoney } from "@/shared/lib/money";
import { formatTime } from "@/shared/lib/dates";
import { cn } from "@/shared/ui/cn";
import type { SaleRow } from "@/modules/admin/sales/queries";

type Props = {
  sales: SaleRow[];
  details: Record<string, SaleDetail>;
};

export function SalesHistoryView({ sales, details }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center">
        <ReceiptText className="size-8 text-slate-400" />
        <p className="text-sm font-semibold text-slate-700">No sales yet</p>
        <p className="text-sm text-slate-500">Sales will appear here as you charge customers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sales.map((sale) => {
        const isOpen = expanded.has(sale.id);
        const detail = details[sale.id];

        return (
          <div
            key={sale.id}
            className="rounded-xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-sm"
          >
            <button
              type="button"
              onClick={() => toggle(sale.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <ReceiptText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  Sale #{sale.sale_no}
                </p>
                <p className="text-xs text-slate-500">
                  {formatTime(sale.created_at)} · {sale.item_count} {sale.item_count === 1 ? "item" : "items"}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-900 tabular-nums">
                {formatMoney(sale.total)}
              </span>
              {isOpen ? (
                <ChevronUp className="size-4 text-slate-400" />
              ) : (
                <ChevronDown className="size-4 text-slate-400" />
              )}
            </button>

            {isOpen && detail ? (
              <div className="border-t border-slate-100 px-4 py-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="pb-1 font-medium">Item</th>
                      <th className="pb-1 text-center font-medium">Qty</th>
                      <th className="pb-1 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detail.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1.5 text-slate-700">{item.item_name}</td>
                        <td className="py-1.5 text-center tabular-nums text-slate-600">{item.qty}</td>
                        <td className="py-1.5 text-right font-medium tabular-nums text-slate-900">
                          {formatMoney(item.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="text-sm font-semibold text-slate-900">Total</span>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums">
                    {formatMoney(sale.total)}
                  </span>
                </div>
                <div className="mt-3">
                  <Link
                    href={`/admin/receipt/${sale.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
                  >
                    <Printer className="size-3.5" />
                    Reprint
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
