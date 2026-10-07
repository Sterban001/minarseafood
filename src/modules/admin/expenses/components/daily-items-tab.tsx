"use client";

import { useId, useState } from "react";
import { Calculator, PackagePlus, ShoppingBag, Sparkles } from "lucide-react";

import { ActionForm } from "@/modules/admin/components/action-form";
import { formatMoney } from "@/shared/lib/money";
import type { Expense } from "@/shared/types/database";
import { Badge, Card, CardHeader } from "@/shared/ui/surface";
import { Field, Input, Select } from "@/shared/ui/form";
import { SubmitButton } from "@/shared/ui/submit-button";

import { createItemExpense } from "../actions";
import { ITEM_CATEGORIES, ITEM_UNIT_OPTIONS, QUICK_ITEM_SUGGESTIONS } from "../types";
import { DeleteExpenseButton } from "./delete-expense-button";

export function DailyItemsTab({
  date,
  items,
  total,
}: {
  date: string;
  items: Expense[];
  total: number;
}) {
  const formId = useId();
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState<string>("1");
  const [unit, setUnit] = useState<string>("kg");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [category, setCategory] = useState<string>("Raw Seafood");

  const q = parseFloat(quantity) || 0;
  const p = parseFloat(unitPrice) || 0;
  const computedTotal = Math.round(q * p * 100) / 100;

  const handleSelectPreset = (preset: (typeof QUICK_ITEM_SUGGESTIONS)[number]) => {
    setItemName(preset.name);
    setUnit(preset.unit);
    setCategory(preset.category);
  };

  return (
    <div className="space-y-6">
      {/* 1. Daily Items Total Card */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-600 bg-linear-to-br from-emerald-50/50 to-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-emerald-800 uppercase">
                Daily Itemized Expenses Total
              </p>
              <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {formatMoney(total)}
              </h3>
            </div>
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <ShoppingBag className="size-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
            <PackagePlus className="size-3.5 text-emerald-600" />
            <span>
              <strong>{items.length}</strong> {items.length === 1 ? "item expense" : "item expenses"} recorded today
            </span>
          </div>
        </Card>

        <Card className="p-4 sm:col-span-1 lg:col-span-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>Frequent Restaurant Supplies (Click to autofill)</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Quickly fill common daily kitchen and counter supplies:
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {QUICK_ITEM_SUGGESTIONS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <span>{preset.name}</span>
                <span className="text-[10px] text-slate-400">({preset.unit})</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* 2. Add Item Expense Form */}
      <Card>
        <CardHeader
          title="Add Daily Item Expense"
          subtitle="Add an itemized purchase by quantity and unit price"
        />
        <div className="p-4 sm:p-5">
          <ActionForm action={createItemExpense} announceSuccess className="space-y-4">
            <input type="hidden" name="date" value={date} />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <Field label="Item Name / Supply" htmlFor={`item_name_${formId}`} required>
                  <Input
                    id={`item_name_${formId}`}
                    name="item_name"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Raw Vanjaram Fish"
                    required
                  />
                </Field>
              </div>

              <div className="lg:col-span-3">
                <Field label="Category" htmlFor={`category_${formId}`}>
                  <Select
                    id={`category_${formId}`}
                    name="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {ITEM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="lg:col-span-2">
                <Field label="Quantity" htmlFor={`quantity_${formId}`} required>
                  <Input
                    id={`quantity_${formId}`}
                    name="quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                    required
                  />
                </Field>
              </div>

              <div className="lg:col-span-3">
                <Field label="Unit" htmlFor={`unit_${formId}`}>
                  <Select
                    id={`unit_${formId}`}
                    name="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    {ITEM_UNIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <Field label={`Price per ${unit} (₹)`} htmlFor={`unit_price_${formId}`} required>
                  <Input
                    id={`unit_price_${formId}`}
                    name="unit_price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="250"
                    required
                  />
                </Field>
              </div>

              <div className="lg:col-span-3">
                <Field label="Payment Mode" htmlFor={`payment_method_${formId}`}>
                  <Select id={`payment_method_${formId}`} name="payment_method" defaultValue="cash">
                    <option value="cash">💵 Cash Till</option>
                    <option value="upi">📱 UPI / Online</option>
                    <option value="card">💳 Card</option>
                  </Select>
                </Field>
              </div>

              <div className="lg:col-span-3">
                <Field label="Total Calculated Cost" hint="Auto-computed: Qty × Unit Price">
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-800">
                    <Calculator className="size-4 text-emerald-600" />
                    <span>{formatMoney(computedTotal)}</span>
                  </div>
                </Field>
              </div>

              <div className="flex items-end lg:col-span-3">
                <SubmitButton
                  variant="primary"
                  className="w-full"
                  pendingLabel="Adding Item…"
                >
                  <PackagePlus className="size-4" />
                  Add Item Expense
                </SubmitButton>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Field label="Notes / Supplier (Optional)" htmlFor={`notes_${formId}`}>
                <Input
                  id={`notes_${formId}`}
                  name="notes"
                  placeholder="e.g. Bought from wholesale market, 2 boxes packed"
                />
              </Field>
            </div>
          </ActionForm>
        </div>
      </Card>

      {/* 3. Recorded Items Table */}
      <Card>
        <CardHeader
          title="Daily Itemized Expenses"
          subtitle={`Total: ${formatMoney(total)} (${items.length} items purchased)`}
        />
        {items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <ShoppingBag className="mx-auto size-10 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">No item expenses recorded for this date.</p>
            <p className="mt-1 text-xs text-slate-400">
              Add individual supply purchases with quantity and unit price using the form above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-600 uppercase">
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Qty & Unit</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total Price</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.item_name || "Item"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral" className="text-xs">
                        {item.category || "General"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {item.quantity != null ? Number(item.quantity).toLocaleString() : 1}{" "}
                      <span className="text-xs text-slate-500">{item.unit || "kg"}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatMoney(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatMoney(item.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {item.payment_method === "upi" ? "📱 UPI" : item.payment_method === "card" ? "💳 Card" : "💵 Cash"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {item.notes || "—"}
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
                    Daily Items Total:
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold text-emerald-700">
                    {formatMoney(total)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
