import { ArrowRight, Phone } from "lucide-react";

import { phoneHref, restaurant } from "@/shared/config/restaurant";
import { ButtonLink } from "@/shared/ui/button";

import { Ornament } from "./ornament";

export function VisitCta({
  title = "Come hungry",
  description = `Walk in, or call ${restaurant.phone} and we will keep a table for you.`,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="bg-foam">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink px-8 py-14 text-center text-white sm:px-16">
          <div
            aria-hidden
            className="absolute -top-24 right-10 size-64 rounded-full bg-spice-500/15 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-28 left-6 size-72 rounded-full bg-brand-500/20 blur-3xl"
          />
          <div className="relative">
            <p className="text-xs font-semibold tracking-[0.32em] text-spice-300 uppercase">
              Panje Shah Road
            </p>
            <Ornament className="mt-4 justify-center" />
            <h2 className="mt-5 font-display text-3xl font-semibold sm:text-5xl">{title}</h2>
            <p className="mx-auto mt-4 max-w-lg text-brand-100/90">{description}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink
                href="/contact"
                size="lg"
                variant="spice"
                className="rounded-full px-7 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
              >
                Directions and hours
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <a
                href={phoneHref}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 text-sm font-medium text-white backdrop-blur hover:bg-white/10"
              >
                <Phone className="size-4" aria-hidden />
                Call {restaurant.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
