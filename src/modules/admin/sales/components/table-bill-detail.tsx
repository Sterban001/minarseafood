"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Receipt, Trash2, X } from "lucide-react";

import { ActionForm } from "@/modules/admin/components/action-form";
import { deleteSaleItemAction } from "@/modules/admin/sales/actions";
import { formatMoney } from "@/shared/lib/money";
import { cn } from "@/shared/ui/cn";
import { SubmitButton } from "@/shared/ui/submit-button";

import type { TableSaleWithItems } from "../queries";

export function TableBillDetail({
  sales,
  tableLabel,
}: {
  sales: TableSaleWithItems[];
  tableLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!sales.length) return null;

  const totalItems = sales.reduce(
    (sum, s) => sum + s.items.reduce((a, i) => a + i.qty, 0),
    0,
  );

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all",
          expanded
            ? "bg-emerald-100 text-emerald-900"
            : "bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100/80",
        )}
      >
        <span className="flex items-center gap-1.5">
          <Receipt className="size-3.5" />
          {sales.length} {sales.length === 1 ? "bill" : "bills"} · {totalItems}{" "}
          {totalItems === 1 ? "item" : "items"}
        </span>
        {expanded ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
      </button>

      {expanded ? (
        <div className="mt-1.5 space-y-2">
          {sales.map((sale) => (
            <SaleBillCard key={sale.saleId} sale={sale} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SaleBillCard({ sale }: { sale: TableSaleWithItems }) {
  const time = new Date(sale.createdAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="rounded-lg border border-emerald-200/60 bg-white shadow-xs">
      {/* Sale header */}
      <div className="flex items-center justify-between border-b border-emerald-100 px-2.5 py-1.5">
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
          <Receipt className="size-3" />
          Bill #{sale.saleNo}
        </span>
        <span className="flex items-center gap-2 text-[0.68rem] text-slate-500">
          <span>{time}</span>
          <span className="font-bold text-emerald-700 tabular-nums">
            {formatMoney(sale.total)}
          </span>
        </span>
      </div>

      {/* Items list */}
      {sale.items.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {sale.items.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-2 px-2.5 py-1.5 transition-colors hover:bg-red-50/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-800">
                  {item.itemName}
                </p>
                <p className="text-[0.65rem] text-slate-500 tabular-nums">
                  {item.qty} × {formatMoney(item.itemPrice)} ={" "}
                  <span className="font-semibold text-slate-700">
                    {formatMoney(item.lineTotal)}
                  </span>
                </p>
              </div>

              <ActionForm
                action={deleteSaleItemAction}
                announceSuccess
                className="shrink-0"
                messageClassName="absolute right-0 top-full z-10 mt-0.5 w-44"
              >
                <input type="hidden" name="saleItemId" value={item.id} />
                <SubmitButton
                  variant="ghost"
                  size="sm"
                  className="!h-6 !w-6 !p-0 text-slate-300 opacity-0 transition-all hover:!text-red-600 group-hover:opacity-100"
                  pendingLabel=""
                  title={`Remove ${item.itemName}`}
                >
                  <X className="size-3.5" />
                </SubmitButton>
              </ActionForm>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-2.5 py-2 text-xs text-slate-400 italic">
          No items
        </p>
      )}
    </div>
  );
}
