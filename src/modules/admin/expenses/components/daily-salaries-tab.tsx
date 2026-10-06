"use client";

import { useState } from "react";
import { Banknote, Plus, UserCheck, Users } from "lucide-react";

import { ActionForm } from "@/modules/admin/components/action-form";
import { formatMoney } from "@/shared/lib/money";
import type { Expense } from "@/shared/types/database";
import { Badge, Card, CardHeader } from "@/shared/ui/surface";
import { Field, Input, Select } from "@/shared/ui/form";
import { SubmitButton } from "@/shared/ui/submit-button";

import { createSalaryExpense } from "../actions";
import { STAFF_ROLE_PRESETS } from "../types";
import { DeleteExpenseButton } from "./delete-expense-button";

export function DailySalariesTab({
  date,
  salaries,
  total,
  recentStaff,
}: {
  date: string;
  salaries: Expense[];
  total: number;
  recentStaff: string[];
}) {
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [amount, setAmount] = useState("");

  const handleSelectPreset = (name: string, role?: string) => {
    setSelectedStaff(name);
    if (role) setSelectedRole(role);
  };

  return (
    <div className="space-y-6">
      {/* 1. Daily Salaries Total Highlight Card */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-brand-600 bg-linear-to-br from-brand-50/50 to-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-brand-700 uppercase">
                Daily Salaries Total
              </p>
              <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {formatMoney(total)}
              </h3>
            </div>
            <div className="flex size-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <Banknote className="size-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
            <Users className="size-3.5 text-brand-600" />
            <span>
              <strong>{salaries.length}</strong> staff salary {salaries.length === 1 ? "payment" : "payments"} recorded
            </span>
          </div>
        </Card>

        <Card className="p-4 sm:col-span-1 lg:col-span-2">
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Quick Staff Presets
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Click any staff role or recent name to quickly fill the salary form below:
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {recentStaff.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleSelectPreset(name)}
                className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50/80 px-2.5 py-1 text-xs font-medium text-brand-800 transition-colors hover:bg-brand-100"
              >
                <UserCheck className="size-3 text-brand-600" />
                {name}
              </button>
            ))}
            {STAFF_ROLE_PRESETS.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => handleSelectPreset(role, role)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-slate-100"
              >
                <Plus className="size-3 text-slate-400" />
                {role}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* 2. Record Staff Salary Form */}
      <Card>
        <CardHeader
          title="Record Staff Daily Salary"
          subtitle="Add daily wage or daily salary disbursement for the day"
        />
        <div className="p-4 sm:p-5">
          <ActionForm action={createSalaryExpense} announceSuccess className="space-y-4">
            <input type="hidden" name="date" value={date} />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Staff Member / Name" htmlFor="staff_name" required>
                <Input
                  id="staff_name"
                  name="staff_name"
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  placeholder="e.g. Imran (Head Chef)"
                  required
                />
              </Field>

              <Field label="Role / Designation" htmlFor="role">
                <Input
                  id="role"
                  name="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  placeholder="e.g. Cook / Waiter"
                />
              </Field>

              <Field label="Amount (₹)" htmlFor="salary_amount" required>
                <Input
                  id="salary_amount"
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  required
                />
              </Field>

              <Field label="Payment Mode" htmlFor="payment_method">
                <Select id="payment_method" name="payment_method" defaultValue="cash">
                  <option value="cash">💵 Cash Till</option>
                  <option value="upi">📱 UPI / Online</option>
                  <option value="card">💳 Card</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field label="Notes / Remarks" htmlFor="notes">
                  <Input
                    id="notes"
                    name="notes"
                    placeholder="Optional notes (e.g. Advance adjustment, overtime, full shift)"
                  />
                </Field>
              </div>

              <div className="flex items-end">
                <SubmitButton
                  variant="primary"
                  className="w-full"
                  pendingLabel="Saving Salary…"
                >
                  <Plus className="size-4" />
                  Record Daily Salary
                </SubmitButton>
              </div>
            </div>
          </ActionForm>
        </div>
      </Card>

      {/* 3. Recorded Salaries Table */}
      <Card>
        <CardHeader
          title="Recorded Salaries for Date"
          subtitle={`Total: ${formatMoney(total)} (${salaries.length} payments)`}
        />
        {salaries.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Users className="mx-auto size-10 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">No salary records for this date.</p>
            <p className="mt-1 text-xs text-slate-400">
              Use the form above to record staff wages or salary payments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-600 uppercase">
                  <th className="px-4 py-3">Staff Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salaries.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {s.staff_name || "Staff Member"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.role ? (
                        <Badge tone="brand" className="font-normal text-xs">
                          {s.role}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {s.payment_method === "upi" ? "📱 UPI" : s.payment_method === "card" ? "💳 Card" : "💵 Cash"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {s.notes || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatMoney(s.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <DeleteExpenseButton id={s.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                  <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-600">
                    Daily Salaries Total:
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold text-brand-800">
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
