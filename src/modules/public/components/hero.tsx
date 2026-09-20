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
                  className="rounded-full px-7 shadow-[0_16px_40px_-12px_rgba(216,138,32,0.85)]"
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

          <dl className="mt-10 grid items-stretch gap-5 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-md sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/10 sm:px-2 sm:py-5 lg:mt-4">
            <Fact icon={<Clock className="size-4" aria-hidden />} label="Open today">
              {restaurant.hours[0].time}
            </Fact>
            <Fact icon={<MapPin className="size-4" aria-hidden />} label="Where">
              {restaurant.address.line1}, {restaurant.address.line2}
            </Fact>
            <Fact icon={<Phone className="size-4" aria-hidden />} label="Call us">
              <a href={phoneHref} className="hover:text-white">
                {restaurant.phone}
              </a>
            </Fact>
          </dl>
        </div>
      </div>

      <WaveDivider fill="#f3eee3" />
    </section>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center gap-3 px-3 py-1 sm:px-6">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-spice-300">
        {icon}
      </div>
      <div className="min-w-0 text-left">
        <dt className="text-[0.65rem] font-semibold tracking-[0.2em] text-spice-300 uppercase">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm whitespace-nowrap text-brand-50">{children}</dd>
      </div>
    </div>
  );
}
