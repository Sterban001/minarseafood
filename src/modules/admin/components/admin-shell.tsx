import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";

import { signOut } from "@/modules/admin/auth/actions";
import { roleLabels, type StaffSession } from "@/modules/admin/auth/session";
import { restaurant } from "@/shared/config/restaurant";
import { formatBusinessDate, todayBusinessDate } from "@/shared/lib/dates";
import { Badge } from "@/shared/ui/surface";

import { AdminBottomNav, AdminSidebarNav } from "./admin-nav";

export function AdminShell({
  session,
  children,
}: {
  session: StaffSession;
  children: ReactNode;
}) {
  const { profile } = session;

  return (
    <div className="flex min-h-dvh">
      <aside className="print-hidden hidden w-60 shrink-0 flex-col bg-brand-900 lg:flex">
        <div className="px-4 py-5">
          <p className="font-display text-lg leading-tight font-semibold text-white">
            {restaurant.displayName}
          </p>
          <p className="mt-0.5 text-xs text-brand-300">Staff terminal</p>
        </div>

        <AdminSidebarNav role={profile.role} />

        <div className="mt-auto space-y-3 border-t border-brand-800 px-4 py-4">
          <div>
            <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
            <p className="text-xs text-brand-300">{roleLabels[profile.role]}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-brand-200 transition-colors hover:bg-brand-800 hover:text-white"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="print-hidden sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:px-6">
          <Link href="/admin" className="font-display text-base font-semibold lg:hidden">
            {restaurant.displayName}
          </Link>

          <Badge tone="brand">Sales day {formatBusinessDate(todayBusinessDate())}</Badge>
          <span className="hidden text-xs text-slate-500 xl:inline">
            the sales day rolls over at 5am
          </span>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 lg:inline">
              {profile.full_name}
            </span>
            <Badge tone={profile.role === "waiter" ? "neutral" : "spice"}>
              {roleLabels[profile.role]}
            </Badge>
            <form action={signOut} className="lg:hidden">
              <button
                type="submit"
                aria-label="Sign out"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <LogOut className="size-4" aria-hidden />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 px-4 pt-4 pb-20 lg:px-6 lg:pb-8">{children}</main>
      </div>

      <AdminBottomNav role={profile.role} />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="print-hidden mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
