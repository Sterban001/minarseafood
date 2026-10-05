"use client";

import { useEffect, useState, useTransition } from "react";
import { Calendar, Check, CircleAlert, Loader2, Play, Power, X } from "lucide-react";

import { endDay, startDay } from "@/modules/admin/sales/actions";
import { formatBusinessDate, todayBusinessDate } from "@/shared/lib/dates";
import type { BusinessDay } from "@/shared/types/database";
import { Button } from "@/shared/ui/button";

export function DayControls({ activeDay }: { activeDay: BusinessDay | null }) {
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [targetDate, setTargetDate] = useState(() => todayBusinessDate());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Listen for global open-start-day event (e.g. from banner in Quick Sale)
  useEffect(() => {
    const handleOpen = () => {
      setError(null);
      setTargetDate(todayBusinessDate());
      setIsStartOpen(true);
    };
    window.addEventListener("minar:open-start-day", handleOpen);
    return () => window.removeEventListener("minar:open-start-day", handleOpen);
  }, []);

  const handleStart = () => {
    setError(null);
    startTransition(async () => {
      const res = await startDay(targetDate);
      if (!res.ok) {
        setError(res.error || "Failed to start day.");
      } else {
        setIsStartOpen(false);
      }
    });
  };

  const handleEnd = () => {
    setError(null);
    startTransition(async () => {
      const res = await endDay();
      if (!res.ok) {
        setError(res.error || "Failed to end day.");
      } else {
        setIsEndOpen(false);
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {activeDay ? (
          <>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
              </span>
              <span>Day: {formatBusinessDate(activeDay.date)}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setIsEndOpen(true);
              }}
              className="border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800 text-xs font-semibold"
              title="End current business day"
            >
              <Power className="size-3.5 text-red-600" />
              <span>End Day</span>
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
              <span className="size-2 rounded-full bg-amber-500" />
              <span>Day Closed</span>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setError(null);
                setTargetDate(todayBusinessDate());
                setIsStartOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs"
            >
              <Play className="size-3.5 fill-current" />
              <span>Start Day</span>
            </Button>
          </>
        )}
      </div>

      {/* Start Day Modal */}
      {isStartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isPending && setIsStartOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Play className="size-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Start Business Day</h3>
                  <p className="text-xs text-slate-500">Open store session to begin sales</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isPending && setIsStartOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <CircleAlert className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Business Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    disabled={isPending}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-2xs focus:border-emerald-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <Calendar className="pointer-events-none absolute right-3.5 top-3 size-4 text-slate-400" />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Counter sales, bill numbers (#1, #2), and reports will be linked to this business date.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsStartOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleStart}
                disabled={isPending || !targetDate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    <span>Start Day ({formatBusinessDate(targetDate)})</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* End Day Modal */}
      {isEndOpen && activeDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isPending && setIsEndOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
                  <Power className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">End Business Day</h3>
                  <p className="text-xs text-slate-500">Close session for {formatBusinessDate(activeDay.date)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isPending && setIsEndOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <CircleAlert className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
              <p className="font-semibold">Confirm Day Close</p>
              <p className="mt-0.5 text-amber-800">
                Are you sure you want to close the business day for <strong>{formatBusinessDate(activeDay.date)}</strong>? Once closed, no new sales can be entered until you start a new day.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsEndOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleEnd}
                disabled={isPending}
                className="font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Ending Day...</span>
                  </>
                ) : (
                  <>
                    <Power className="size-4" />
                    <span>Confirm & End Day</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
