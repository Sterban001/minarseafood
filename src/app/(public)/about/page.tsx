import type { Metadata } from "next";

import { PageHero } from "@/modules/public/components/page-hero";
import { PhotoTile } from "@/modules/public/components/photo-tile";
import { Section, SectionHeading } from "@/modules/public/components/section";
import { VisitCta } from "@/modules/public/components/visit-cta";
import { restaurant } from "@/shared/config/restaurant";

export const metadata: Metadata = {
  title: "Our story",
  description: `About ${restaurant.name} — a family-run seafood kitchen.`,
};

const timeline = [
  {
    label: "Every morning",
    body: "Fish and prawns come in. If it isn't right, it doesn't go on the fire.",
  },
  {
    label: "By ten",
    body: "Masalas are ground for the day, not for the week.",
  },
  {
    label: "From half eleven",
    body: "The kitchen is hot. Your fish goes on when you order it.",
  },
  {
    label: "Late",
    body: "We keep the kitchen open for the people who eat late, because we are those people too.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Our story"
        title={
          <>
            We only know one way
            <span className="mt-1 block italic text-spice-200">to cook fish.</span>
          </>
        }
        description={restaurant.description}
      />

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <SectionHeading
              align="left"
              eyebrow="Charminar"
              title="A small kitchen with one rule"
              description={`${restaurant.name} is a small seafood kitchen in Charminar. The rule has not changed: buy it fresh, cook it to order, and charge a fair price.`}
            />
          </div>
          <PhotoTile
            className="aspect-4/3 lg:col-span-2"
            label="Our kitchen"
            caption="Where it all happens"
          />
        </div>
      </Section>

      <Section tone="sand">
        <SectionHeading
          eyebrow="A day here"
          title="From the kitchen to your table"
          description="Nothing clever. Just the same sequence, every single day."
        />

        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {timeline.map((entry, index) => (
            <li
              key={entry.label}
              className="rounded-3xl bg-white p-6 ring-1 ring-brand-950/8"
            >
              <p className="font-display text-4xl text-spice-500/50">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-spice-700 uppercase">
                {entry.label}
              </p>
              <p className="mt-2 leading-relaxed text-slate-700">{entry.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <VisitCta
        title="Hungry yet?"
        description="Have a look at what is on today, or call and we will hold a table."
      />
    </>
  );
}
