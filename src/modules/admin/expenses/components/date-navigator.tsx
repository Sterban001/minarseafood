"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import { addDays, formatBusinessDate, todayBusinessDate } from "@/shared/lib/dates";

export function DateNavigator({
  date,
  activeDate,
  currentTab,
}: {
  date: string;
  activeDate: string;
  currentTab: string;
}) {
  const router = useRouter();
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const isToday = date === activeDate || date === todayBusinessDate();

  const handleDateChange = (newDate: string) => {
    if (newDate) {
      router.push(`/admin/expenses?date=${newDate}&tab=${currentTab}`);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
      <div className="flex items-center gap-1.5">
        <Link
          href={`/admin/expenses?date=${prev}&tab=${currentTab}`}
          className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100"
          title="Previous day"
        >
          <ChevronLeft className="size-4" />
        </Link>

        <div className="flex items-center gap-2 px-2">
          <Calendar className="size-4 text-brand-600" />
          <span className="text-sm font-semibold text-slate-900">
            {formatBusinessDate(date)}
          </span>
          {isToday ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              Today / Active
            </span>
          ) : null}
        </div>

        {!isToday ? (
          <Link
            href={`/admin/expenses?date=${next}&tab=${currentTab}`}
            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100"
            title="Next day"
          >
            <ChevronRight className="size-4" />
          </Link>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs focus:border-brand-500 focus:outline-none"
        />

        {!isToday ? (
          <Link
            href={`/admin/expenses?date=${activeDate}&tab=${currentTab}`}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
          >
            <RotateCcw className="size-3" />
            Active Day
          </Link>
        ) : null}
      </div>
    </div>
  );
}
