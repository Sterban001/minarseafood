"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react";

export default function PrintError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PrintError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-4">
        <AlertTriangle className="size-7" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Receipt unavailable</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-600">
        Could not load this receipt. It might have already been settled or no active orders exist.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
        >
          <RefreshCw className="size-4" />
          Try Again
        </button>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
        >
          <ArrowLeft className="size-4" />
          Back to Sales
        </Link>
      </div>
    </div>
  );
}
