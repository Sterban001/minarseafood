import { ArrowRight, Fish, Flame, UtensilsCrossed } from "lucide-react";

import { DishCard } from "@/modules/public/components/dish-card";
import { Hero } from "@/modules/public/components/hero";
import { Ornament } from "@/modules/public/components/ornament";
import { Section, SectionHeading } from "@/modules/public/components/section";
import { VisitCta } from "@/modules/public/components/visit-cta";
import { getFeaturedDishes } from "@/modules/public/data/menu";
import { ButtonLink } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/surface";

/** The menu changes with the catch, so re-read it a few times an hour. */
export const revalidate = 300;

export default async function HomePage() {
  const featured = await getFeaturedDishes(6);

  return (
    <>
      <Hero />

      <Section>
        <SectionHeading
          eyebrow="Why people come back"
          title="Bought this morning, cooked this evening"
          description="We buy fresh fish and prawns and cook to order. Nothing sits waiting for you."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          <Pillar
            index="01"
            icon={<Fish className="size-5" aria-hidden />}
            title="The day's fish"
            body="Fish and prawns cooked when you order them, not pulled off a holding tray."
          />
          <Pillar
            index="02"
            icon={<Flame className="size-5" aria-hidden />}
            title="Cooked to order"
            body="Your plate goes on when you sit down. That is the whole trick."
          />
          <Pillar
            index="03"
            icon={<UtensilsCrossed className="size-5" aria-hidden />}
            title="Walk in"
            body="Panje Shah Road, Charminar. Come hungry."
          />
        </div>
      </Section>

      <Section tone="sand">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            align="left"
            eyebrow="Ask for these"
            title="House favourites"
            description="What the kitchen would order if it were sitting down to eat."
          />
          <ButtonLink
            href="/menu"
            variant="outline"
            className="rounded-full border-brand-900/15 bg-white"
          >
            Full menu
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>

        {featured.length > 0 ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-12 border-brand-900/10 bg-white/80"
            title="The menu is being set up"
            description="House favourites will show here. Until then, the full menu is a tap away."
            action={
              <ButtonLink href="/menu" className="rounded-full">
                Browse the menu
              </ButtonLink>
            }
          />
        )}
      </Section>

      <VisitCta />
    </>
  );
}

function Pillar({
  index,
  icon,
  title,
  body,
}: {
  index: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-brand-950/8 bg-white p-7 shadow-[0_16px_40px_-28px_rgba(12,39,44,0.4)]">
      <p className="font-display text-4xl text-spice-500/40">{index}</p>
      <div className="mt-4 flex size-11 items-center justify-center rounded-full bg-ink text-spice-300">
        {icon}
      </div>
      <h3 className="mt-5 font-display text-2xl font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
      <Ornament className="mt-6" />
    </div>
  );
}
