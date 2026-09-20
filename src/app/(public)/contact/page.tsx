import type { Metadata } from "next";
import { Clock, MapPin, Phone } from "lucide-react";

import { PageHero } from "@/modules/public/components/page-hero";
import {
  fullAddress,
  mapsEmbedUrl,
  mapsLinkUrl,
  phoneHref,
  restaurant,
  whatsappHref,
} from "@/shared/config/restaurant";
import { ButtonLink } from "@/shared/ui/button";

export const metadata: Metadata = {
  title: "Visit us",
  description: `Address, hours and phone number for ${restaurant.name}.`,
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Visit us"
        title={
          <>
            Come and eat
            <span className="mt-1 block italic text-spice-200">with us.</span>
          </>
        }
        description="Walk in for lunch, or call if you are coming with a crowd."
      />

      <section className="bg-foam">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-2">
              <InfoCard>
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
                  <MapPin className="size-4 text-spice-600" aria-hidden />
                  Address
                </h2>
                <p className="mt-3 leading-relaxed text-slate-600">{fullAddress}</p>
                <ButtonLink
                  href={mapsLinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  variant="secondary"
                  size="sm"
                  className="mt-5 rounded-full"
                >
                  Open in Google Maps
                </ButtonLink>
              </InfoCard>

              <InfoCard>
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
                  <Clock className="size-4 text-spice-600" aria-hidden />
                  Kitchen hours
                </h2>
                <dl className="mt-4 space-y-3 text-sm">
                  {restaurant.hours.map(({ days, time }) => (
                    <div key={days} className="flex justify-between gap-4">
                      <dt className="text-slate-600">{days}</dt>
                      <dd className="font-medium text-ink">{time}</dd>
                    </div>
                  ))}
                </dl>
              </InfoCard>

              <InfoCard>
                <h2 className="font-display text-xl font-semibold text-ink">Reservations</h2>
                <div className="mt-4 space-y-2 text-sm">
                  <a
                    href={phoneHref}
                    className="flex items-center gap-2 text-brand-800 hover:text-ink"
                  >
                    <Phone className="size-4" aria-hidden />
                    {restaurant.phone}
                  </a>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-brand-800 hover:text-ink"
                  >
                    WhatsApp the kitchen
                  </a>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  For a bigger group, a quick call helps.
                </p>
              </InfoCard>
            </div>

            <div className="overflow-hidden rounded-3xl ring-1 ring-brand-950/10 lg:col-span-3">
              <iframe
                title={`Map to ${restaurant.name}`}
                src={mapsEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-80 w-full border-0 lg:h-full lg:min-h-[32rem]"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_16px_40px_-28px_rgba(12,39,44,0.45)] ring-1 ring-brand-950/8">
      {children}
    </div>
  );
}
