import Link from "next/link";
import { Clock, MapPin, Phone } from "lucide-react";

import { fullAddress, mapsLinkUrl, phoneHref, restaurant } from "@/shared/config/restaurant";

import { Ornament } from "./ornament";
import { SiteLogo } from "./site-logo";

const links = [
  { href: "/menu", label: "Menu" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "Our story" },
  { href: "/contact", label: "Visit us" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-ink text-brand-200">
      <div className="h-px bg-linear-to-r from-transparent via-spice-400/70 to-transparent" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <SiteLogo className="size-16 shrink-0" alt="" />
            <p className="font-display text-2xl font-semibold text-white">
              {restaurant.displayName}
            </p>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-100/80">
            {restaurant.tagline}. A family kitchen in Charminar.
          </p>
          <Ornament className="mt-6" />
        </div>

        <div className="space-y-3 text-sm">
          <h2 className="text-xs font-semibold tracking-[0.2em] text-spice-300 uppercase">
            Find us
          </h2>
          <a
            href={mapsLinkUrl}
            target="_blank"
            rel="noreferrer"
            className="flex gap-2 text-brand-100/85 hover:text-white"
          >
            <MapPin className="mt-0.5 size-4 shrink-0 text-spice-400" aria-hidden />
            {fullAddress}
          </a>
          <a href={phoneHref} className="flex gap-2 text-brand-100/85 hover:text-white">
            <Phone className="mt-0.5 size-4 shrink-0 text-spice-400" aria-hidden />
            {restaurant.phone}
          </a>
        </div>

        <div className="space-y-3 text-sm">
          <h2 className="text-xs font-semibold tracking-[0.2em] text-spice-300 uppercase">
            Kitchen hours
          </h2>
          {restaurant.hours.map(({ days, time }) => (
            <p key={days} className="flex gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-spice-400" aria-hidden />
              <span>
                <span className="block text-brand-50">{days}</span>
                <span className="text-brand-200">{time}</span>
              </span>
            </p>
          ))}
          <nav className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} className="text-brand-100/80 hover:text-white">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl px-4 py-4 text-xs text-brand-300 sm:px-6">
          <p>
            © {new Date().getFullYear()} {restaurant.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
