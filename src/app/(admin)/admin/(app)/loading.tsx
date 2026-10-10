export default function AdminAppLoading() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Skeleton Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-2">
        <div className="space-y-2">
          <div className="h-6 w-36 rounded-md bg-slate-200" />
          <div className="h-4 w-52 rounded-md bg-slate-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-slate-100" />
          <div className="h-9 w-28 rounded-lg bg-slate-200" />
        </div>
      </div>

      {/* Top Stat or Filter Bar Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <div className="h-20 rounded-xl border border-slate-200/70 bg-slate-50/80 p-3" />
        <div className="h-20 rounded-xl border border-slate-200/70 bg-slate-50/80 p-3" />
        <div className="h-20 rounded-xl border border-slate-200/70 bg-slate-50/80 p-3" />
        <div className="hidden h-20 rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 sm:block" />
        <div className="hidden h-20 rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 lg:block" />
      </div>

      {/* Main Content Area Grid Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-4 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <div className="size-10 shrink-0 rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="h-4 w-16 rounded bg-slate-100" />
              <div className="h-7 w-20 rounded-md bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
