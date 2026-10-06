"use client";

import { useId, useState } from "react";
import { FolderPlus, ReceiptText, Sparkles, Tag } from "lucide-react";

import { ActionForm } from "@/modules/admin/components/action-form";
import { formatMoney } from "@/shared/lib/money";
import type { Expense } from "@/shared/types/database";
import { Badge, Card, CardHeader } from "@/shared/ui/surface";
import { Field, Input, Select } from "@/shared/ui/form";
import { SubmitButton } from "@/shared/ui/submit-button";

import { createMiscExpense } from "../actions";
import { MISC_CATEGORIES, QUICK_MISC_SUGGESTIONS } from "../types";
import { DeleteExpenseButton } from "./delete-expense-button";

export function DailyOthersTab({
  date,
  others,
  total,
}: {
  date: string;
  others: Expense[];
  total: number;
}) {
  const formId = useId();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Miscellaneous");
  const [amount, setAmount] = useState("");

  const handleSelectPreset = (preset: (typeof QUICK_MISC_SUGGESTIONS)[number]) => {
    setTitle(preset.title);
    setCategory(preset.category);
  };

  return (
    <div className="space-y-6">
      {/* 1. Miscellaneous Total Card */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-amber-500 bg-linear-to-br from-amber-50/50 to-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-amber-800 uppercase">
                Miscellaneous Expenses Total
              </p>
              <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {formatMoney(total)}
              </h3>
            </div>
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <ReceiptText className="size-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
            <Tag className="size-3.5 text-amber-600" />
            <span>
              <strong>{others.length}</strong> {others.length === 1 ? "miscellaneous expense" : "miscellaneous expenses"} recorded
            </span>
          </div>
        </Card>

        <Card className="p-4 sm:col-span-1 lg:col-span-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>Frequent Miscellaneous Presets (Click to autofill)</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Common utility, transportation, maintenance, and petty cash expenses:
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {QUICK_MISC_SUGGESTIONS.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
              >
                <span>{preset.title}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* 2. Add Miscellaneous Expense Form */}
      <Card>
        <CardHeader
          title="Add Miscellaneous Expense (Others)"
          subtitle="Record ad-hoc bills, transport, repairs, supplies, or petty cash"
        />
        <div className="p-4 sm:p-5">
          <ActionForm action={createMiscExpense} announceSuccess className="space-y-4">
            <input type="hidden" name="date" value={date} />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <Field label="Description / Title" htmlFor={`title_${formId}`} required>
                  <Input
                    id={`title_${formId}`}
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Rickshaw transport for fish market"
                    required
                  />
                </Field>
              </div>

              <div className="lg:col-span-4">
                <Field label="Category" htmlFor={`category_${formId}`}>
                  <Select
                    id={`category_${formId}`}
                    name="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {MISC_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="lg:col-span-3">
                <Field label="Amount (₹)" htmlFor={`amount_${formId}`} required>
                  <Input
                    id={`amount_${formId}`}
                    name="amount"
                    type="number"
                    step="1"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="150"
                    required
                  />
                </Field>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <Field label="Payment Mode" htmlFor={`payment_method_${formId}`}>
                  <Select id={`payment_method_${formId}`} name="payment_method" defaultValue="cash">
                    <option value="cash">💵 Cash Till</option>
                    <option value="upi">📱 UPI / Online</option>
                    <option value="card">💳 Card</option>
                  </Select>
                </Field>
              </div>

              <div className="lg:col-span-5">
                <Field label="Notes / Invoice No. (Optional)" htmlFor={`notes_${formId}`}>
                  <Input
                    id={`notes_${formId}`}
                    name="notes"
                    placeholder="e.g. Paid to auto driver directly from cash counter"
                  />
                </Field>
              </div>

              <div className="flex items-end lg:col-span-3">
                <SubmitButton
                  variant="primary"
                  className="w-full"
                  pendingLabel="Recording Expense…"
                >
                  <FolderPlus className="size-4" />
                  Record Expense
                </SubmitButton>
              </div>
            </div>
          </ActionForm>
        </div>
      </Card>

      {/* 3. Recorded Miscellaneous Expenses Table */}
      <Card>
        <CardHeader
          title="Miscellaneous Expenses"
          subtitle={`Total: ${formatMoney(total)} (${others.length} entries)`}
        />
        {others.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <ReceiptText className="mx-auto size-10 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">No miscellaneous expenses recorded for this date.</p>
            <p className="mt-1 text-xs text-slate-400">
              Use the form above to record transport, maintenance, or petty cash expenses.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-600 uppercase">
                  <th className="px-4 py-3">Expense Title / Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {others.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.title || "Miscellaneous Expense"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="warning" className="text-xs">
                        {item.category || "Miscellaneous"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {item.payment_method === "upi" ? "📱 UPI" : item.payment_method === "card" ? "💳 Card" : "💵 Cash"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {item.notes || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatMoney(item.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <DeleteExpenseButton id={item.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                  <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-600">
                    Miscellaneous Total:
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold text-amber-700">
                    {formatMoney(total)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
