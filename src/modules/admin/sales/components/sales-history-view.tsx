"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Printer,
  ReceiptText,
  Trash2,
  X,
} from "lucide-react";

import { deleteSale } from "../actions";
import type { SaleDetail, SaleRow } from "../queries";
import { formatTime } from "@/shared/lib/dates";
import { formatMoney } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";

type Props = {
  sales: SaleRow[];
  details: Record<string, SaleDetail>;
};

export function SalesHistoryView({ sales, details }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("");
  const [saleToDelete, setSaleToDelete] = useState<SaleRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && saleToDelete && !isDeleting) {
        setSaleToDelete(null);
        setDeleteError(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saleToDelete, isDeleting]);

  // Auto-dismiss feedback message after 5 seconds
  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = setTimeout(() => setFeedbackMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmDelete = () => {
    if (!saleToDelete) return;
    setDeleteError(null);
    const target = saleToDelete;

    startDeleteTransition(async () => {
      const res = await deleteSale(target.id);
      if (!res.ok) {
        setDeleteError(res.error || "Failed to delete bill.");
      } else {
        setFeedbackMessage(res.message || `Sale #${target.sale_no} was deleted.`);
        setSaleToDelete(null);
        setDeleteError(null);
        router.refresh();
      }
    });
  };

  const filteredSales = sales.filter((s) => {
    if (!filter.trim()) return true;
    const query = filter.toLowerCase().trim();
    const tableLabel = (s.table_label || "takeaway").toLowerCase();
    const saleNo = `#${s.sale_no}`.toLowerCase();
    return tableLabel.includes(query) || saleNo.includes(query);
  });

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
    <div className="space-y-3">
      {/* Feedback banner */}
      {feedbackMessage ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="rounded p-0.5 text-emerald-600 hover:bg-emerald-100"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      {/* Search / Filter bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by table (e.g. T1) or sale #..."
          className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        {filter ? (
          <button
            type="button"
            onClick={() => setFilter("")}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        ) : null}
      </div>

      {filteredSales.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
          No sales found matching &ldquo;{filter}&rdquo;
        </div>
      ) : null}

      {filteredSales.map((sale) => {
        const isOpen = expanded.has(sale.id);
        const detail = details[sale.id];

        return (
          <div
            key={sale.id}
            className="rounded-xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-sm"
          >
            <div className="flex w-full items-center px-4 py-3">
              <button
                type="button"
                onClick={() => toggle(sale.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <ReceiptText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Sale #{sale.sale_no}
                    {sale.table_label ? (
                      sale.table_label.toLowerCase().includes("takeaway") ||
                      sale.table_label.toLowerCase().startsWith("tk") ? (
                        <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                          🛍️ {sale.table_label}
                        </span>
                      ) : (
                        <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700">
                          Table {sale.table_label}
                        </span>
                      )
                    ) : (
                      <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                        🛍️ Takeaway
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatTime(sale.created_at)} · {sale.item_count}{" "}
                    {sale.item_count === 1 ? "item" : "items"}
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

              <div className="ml-2 flex items-center border-l border-slate-100 pl-2">
                <button
                  type="button"
                  title={`Delete Bill #${sale.sale_no}`}
                  onClick={() => {
                    setDeleteError(null);
                    setSaleToDelete(sale);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Delete Bill #{sale.sale_no}</span>
                </button>
              </div>
            </div>

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
                        <td className="py-1.5 text-center tabular-nums text-slate-600">
                          {item.qty}
                        </td>
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
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/receipt/${sale.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
                    >
                      <Printer className="size-3.5" />
                      Reprint Single Item Sale
                    </Link>

                    {sale.table_id ? (
                      <Link
                        href={`/admin/table-receipt/${sale.table_id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
                      >
                        <Printer className="size-3.5" />
                        Print Full Bill for Table {sale.table_label}
                      </Link>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setSaleToDelete(sale);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/60 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 active:scale-95"
                  >
                    <Trash2 className="size-3.5" />
                    Delete Bill
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {/* Confirmation Modal */}
      {saleToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => !isDeleting && setSaleToDelete(null)}
              disabled={isDeleting}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            >
              <X className="size-5" />
              <span className="sr-only">Close</span>
            </button>

            <div className="flex items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="delete-dialog-title" className="text-base font-bold text-slate-900">
                  Delete Bill #{saleToDelete.sale_no}?
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Are you sure you want to void and remove this bill from history?
                </p>
              </div>
            </div>

            {/* Bill summary preview */}
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-700">
                  {saleToDelete.table_label
                    ? saleToDelete.table_label.toLowerCase().includes("takeaway") ||
                      saleToDelete.table_label.toLowerCase().startsWith("tk")
                      ? `🛍️ ${saleToDelete.table_label}`
                      : `Table ${saleToDelete.table_label}`
                    : "🛍️ Takeaway"}
                </span>
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  {formatMoney(saleToDelete.total)}
                </span>
              </div>

              {details[saleToDelete.id]?.items?.length ? (
                <div className="mt-2.5 max-h-36 space-y-1.5 overflow-y-auto border-t border-slate-200/60 pt-2 text-slate-600">
                  {details[saleToDelete.id].items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-[11px]">
                      <span className="truncate pr-2">
                        {it.item_name} × {it.qty}
                      </span>
                      <span className="font-medium tabular-nums text-slate-800">
                        {formatMoney(it.line_total)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-3.5 rounded-lg border border-amber-200/80 bg-amber-50/80 p-2.5 text-xs text-amber-800">
              <p className="font-semibold text-amber-900">⚠️ Permanent Action</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
                This bill will be permanently removed. The amount ({formatMoney(saleToDelete.total)})
                will be deducted from daily sales, table live status, and financial reports.
              </p>
            </div>

            {deleteError ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700">
                {deleteError}
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => {
                  setSaleToDelete(null);
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    Yes, Delete Bill
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

