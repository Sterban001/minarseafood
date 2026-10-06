"use client";

import { useState } from "react";
import {
  Banknote,
  Boxes,
  ReceiptIndianRupee,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { formatMoney } from "@/shared/lib/money";
import { Card } from "@/shared/ui/surface";
import { cn } from "@/shared/ui/cn";

import type { DailyExpensesData } from "../types";
import { DailyItemsTab } from "./daily-items-tab";
import { DailyOthersTab } from "./daily-others-tab";
import { DailySalariesTab } from "./daily-salaries-tab";
import { DateNavigator } from "./date-navigator";

export type ExpensesTabType = "salaries" | "items" | "others";

export function ExpensesDashboard({
  data,
  activeDate,
  initialTab = "salaries",
  recentStaff,
}: {
  data: DailyExpensesData;
  activeDate: string;
  initialTab?: ExpensesTabType;
  recentStaff: string[];
}) {
  const [activeTab, setActiveTab] = useState<ExpensesTabType>(initialTab);

  const {
    date,
    salaries,
    items,
    others,
    totals,
    salesTotal,
    netProfit,
  } = data;

  return (
    <div className="space-y-6">
      {/* Date Navigation Bar */}
      <DateNavigator date={date} activeDate={activeDate} currentTab={activeTab} />

      {/* Top Level Financial Summary Header */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {/* Card 1: Grand Total Expenses */}
        <Card className="col-span-2 border-l-4 border-l-brand-600 bg-linear-to-br from-brand-50/60 to-white p-3.5 shadow-xs sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-brand-900 uppercase">
              Total Daily Expenses
            </span>
            <div className="flex size-7 items-center justify-center rounded-md bg-brand-100 text-brand-700">
              <Wallet className="size-4" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {formatMoney(totals.grandTotal)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
            <span className="rounded bg-slate-100 px-1.5 py-0.5">
              Salaries: {formatMoney(totals.salariesTotal)}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5">
              Items: {formatMoney(totals.itemsTotal)}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5">
              Others: {formatMoney(totals.othersTotal)}
            </span>
          </div>
        </Card>

        {/* Card 2: Daily Salaries */}
        <button
          type="button"
          onClick={() => setActiveTab("salaries")}
          className={cn(
            "rounded-xl border p-3.5 text-left transition-all shadow-xs",
            activeTab === "salaries"
              ? "border-brand-600 bg-brand-50/40 ring-2 ring-brand-600/20"
              : "border-slate-200 bg-white hover:border-slate-300",
          )}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Salaries Total</span>
            <Banknote className="size-3.5 text-brand-600" />
          </div>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatMoney(totals.salariesTotal)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {totals.salariesCount} {totals.salariesCount === 1 ? "staff" : "staff members"}
          </p>
        </button>

        {/* Card 3: Daily Items */}
        <button
          type="button"
          onClick={() => setActiveTab("items")}
          className={cn(
            "rounded-xl border p-3.5 text-left transition-all shadow-xs",
            activeTab === "items"
              ? "border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20"
              : "border-slate-200 bg-white hover:border-slate-300",
          )}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Items Total</span>
            <Boxes className="size-3.5 text-emerald-600" />
          </div>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatMoney(totals.itemsTotal)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {totals.itemsCount} {totals.itemsCount === 1 ? "supply item" : "supply items"}
          </p>
        </button>

        {/* Card 4: Others (Miscellaneous) */}
        <button
          type="button"
          onClick={() => setActiveTab("others")}
          className={cn(
            "rounded-xl border p-3.5 text-left transition-all shadow-xs",
            activeTab === "others"
              ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20"
              : "border-slate-200 bg-white hover:border-slate-300",
          )}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Others (Misc)</span>
            <ReceiptText className="size-3.5 text-amber-600" />
          </div>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatMoney(totals.othersTotal)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {totals.othersCount} {totals.othersCount === 1 ? "expense" : "expenses"}
          </p>
        </button>
      </div>

      {/* Daily Cashflow / Net Margin Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-500">Day Sales Revenue:</span>
          <span className="font-bold text-slate-900">{formatMoney(salesTotal)}</span>
          <span className="text-slate-300">|</span>
          <span className="font-medium text-slate-500">Expenses Deducted:</span>
          <span className="font-bold text-red-600">-{formatMoney(totals.grandTotal)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-600">Day Cash Balance / Net:</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 font-bold",
              netProfit >= 0
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800",
            )}
          >
            {netProfit >= 0 ? (
              <TrendingUp className="size-3.5 text-emerald-600" />
            ) : (
              <TrendingDown className="size-3.5 text-red-600" />
            )}
            {formatMoney(netProfit)}
          </span>
        </div>
      </div>

      {/* Tab Navigation Pill Bar */}
      <div className="flex border-b border-slate-200">
        <nav className="-mb-px flex space-x-2 sm:space-x-4" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("salaries")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors sm:px-4",
              activeTab === "salaries"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
            )}
          >
            <Banknote className="size-4 shrink-0" />
            <span>Daily Salaries</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-bold",
                activeTab === "salaries"
                  ? "bg-brand-100 text-brand-800"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {formatMoney(totals.salariesTotal)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("items")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors sm:px-4",
              activeTab === "items"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
            )}
          >
            <Boxes className="size-4 shrink-0" />
            <span>Daily Expenses (Itemized)</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-bold",
                activeTab === "items"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {formatMoney(totals.itemsTotal)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("others")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors sm:px-4",
              activeTab === "others"
                ? "border-amber-500 text-amber-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
            )}
          >
            <ReceiptIndianRupee className="size-4 shrink-0" />
            <span>Others (Miscellaneous)</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-bold",
                activeTab === "others"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {formatMoney(totals.othersTotal)}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === "salaries" && (
        <DailySalariesTab
          date={date}
          salaries={salaries}
          total={totals.salariesTotal}
          recentStaff={recentStaff}
        />
      )}

      {activeTab === "items" && (
        <DailyItemsTab
          date={date}
          items={items}
          total={totals.itemsTotal}
        />
      )}

      {activeTab === "others" && (
        <DailyOthersTab
          date={date}
          others={others}
          total={totals.othersTotal}
        />
      )}
    </div>
  );
}
