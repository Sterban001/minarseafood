"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/shared/ui/cn";

import { navItems } from "./nav-items";

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => {
    // Exact match for /admin (the Sale page) to avoid highlighting on all /admin/* routes
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };
}

/** Desktop sidebar links. */
export function AdminSidebarNav() {
  const isActive = useIsActive();

  return (
    <nav className="space-y-1 px-2">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive(href)
              ? "bg-brand-800 text-white"
              : "text-brand-100 hover:bg-brand-800/60 hover:text-white",
          )}
        >
          <Icon className="size-4.5 shrink-0" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Tablet and phone bottom bar. */
export function AdminBottomNav() {
  const isActive = useIsActive();
  const items = navItems.filter((item) => item.primary);

  return (
    <nav className="print-hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, shortLabel, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-xs font-medium",
                isActive(href) ? "text-brand-700" : "text-slate-500",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {shortLabel}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
