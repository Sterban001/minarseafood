"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone, X } from "lucide-react";

import { phoneHref, restaurant } from "@/shared/config/restaurant";
import { buttonClass } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";

import { SiteLogo } from "./site-logo";

const links = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/contact", label: "Visit us" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-ink">

      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="mr-auto flex items-center gap-2.5 sm:gap-3">
          <SiteLogo className="size-10 shrink-0 sm:size-11" priority alt="" />
          <span>
            <span className="block font-display text-lg leading-none font-semibold tracking-wide whitespace-nowrap text-white sm:text-xl">
              {restaurant.displayName}
            </span>
            <span className="mt-1 hidden text-[0.65rem] tracking-[0.22em] text-spice-300 uppercase sm:block">
              Seafood Kitchen
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {links.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-brand-100/90 hover:bg-white/5 hover:text-white",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <a href={phoneHref} className={cn(buttonClass({ variant: "spice", size: "sm" }), "rounded-full")}>
            <Phone className="size-4" aria-hidden />
            Book a table
          </a>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="rounded-full p-2 text-brand-100 hover:bg-white/10 md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-white/10 bg-ink/95 px-4 pb-5 backdrop-blur-xl md:hidden">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block border-b border-white/10 py-3.5 text-sm font-medium text-brand-100 last:border-0"
            >
              {label}
            </Link>
          ))}
          <a
            href={phoneHref}
            className={cn(buttonClass({ variant: "spice", size: "md" }), "mt-4 w-full rounded-full")}
          >
            <Phone className="size-4" aria-hidden />
            Call {restaurant.phone}
          </a>
        </nav>
      ) : null}
    </header>
  );
}
