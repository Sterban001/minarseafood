import { ArrowRight, Clock, MapPin, Phone } from "lucide-react";

import { phoneHref, restaurant } from "@/shared/config/restaurant";
import { ButtonLink } from "@/shared/ui/button";

import { OceanScene } from "./ocean-scene";
import { Ornament } from "./ornament";
import { SiteLogo } from "./site-logo";
import { WaveDivider } from "./wave-divider";

export function Hero() {
  return (
    <section className="relative isolate bg-ink text-white">
      <div className="relative overflow-hidden">
        <OceanScene />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-4 pt-28 pb-6 sm:px-6 lg:min-h-[calc(100dvh-5.5rem)] lg:pb-8">
          <div className="grid items-center gap-8 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
            <div className="min-w-0">
              <p className="text-[0.7rem] font-semibold tracking-[0.32em] text-spice-300 uppercase">
                Charminar · Hyderabad
              </p>
              <Ornament className="mt-3" />
              <h1 className="mt-5 font-display text-[2.7rem] leading-[1.05] font-semibold tracking-tight text-white sm:text-6xl lg:text-[clamp(3.4rem,4.2vw,4.5rem)]">
                Hyderabad Ka Andaaz.
                <span className="mt-2 block italic text-spice-200">Samandar Ka Zaiqa.</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-brand-100/90 sm:text-xl">
                Fresh seafood, served with a touch of the Minar.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink
                  href="/menu"
                  size="lg"
                  variant="spice"
                  className="rounded-full px-7 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
                >
                  See today&apos;s menu
                  <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
                <ButtonLink
                  href="/contact"
                  size="lg"
                  className="rounded-full border border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10"
                >
                  How to find us
                </ButtonLink>
              </div>

              {/* Non-blocking Floating Quick Info Chips */}
              <div className="mt-10 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-brand-100 backdrop-blur-md transition-all hover:bg-white/20">
                  <Clock className="size-3.5 shrink-0 text-spice-300" aria-hidden />
                  <span>
                    <span className="text-spice-300 font-medium">Open: </span>
                    <span className="font-semibold text-white">{restaurant.hours[0].time}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-brand-100 backdrop-blur-md transition-all hover:bg-white/20">
                  <MapPin className="size-3.5 shrink-0 text-spice-300" aria-hidden />
                  <span>
                    <span className="text-spice-300 font-medium">Location: </span>
                    <span className="font-semibold text-white">{restaurant.address.line1}, {restaurant.address.line2}</span>
                  </span>
                </div>

                <a
                  href={phoneHref}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-brand-100 backdrop-blur-md transition-all hover:border-spice-400/50 hover:bg-white/20 hover:text-white"
                >
                  <Phone className="size-3.5 shrink-0 text-spice-300" aria-hidden />
                  <span>
                    <span className="text-spice-300 font-medium">Call Us: </span>
                    <span className="font-semibold text-white">{restaurant.phone}</span>
                  </span>
                </a>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="relative">
                <div className="ocean-pulse absolute inset-10 rounded-full bg-spice-400/25 blur-3xl" />
                <SiteLogo
                  className="relative size-[24rem] drop-shadow-2xl"
                  width={500}
                  height={500}
                  priority
                  alt={restaurant.displayName}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <WaveDivider fill="#f3eee3" />
    </section>
  );
}
