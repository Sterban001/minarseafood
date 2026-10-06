"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteExpense } from "../actions";

export function DeleteExpenseButton({
  id,
  label = "Delete",
}: {
  id: string;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("Are you sure you want to remove this expense entry?")) {
      startTransition(async () => {
        await deleteExpense(id);
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      title={label}
      className="inline-flex items-center gap-1 rounded-md p-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      <Trash2 className="size-3.5" />
      <span className="sr-only sm:not-sr-only sm:text-[11px]">{isPending ? "…" : "Remove"}</span>
    </button>
  );
}
