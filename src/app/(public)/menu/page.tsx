import type { Metadata } from "next";

import { MenuView } from "@/modules/public/components/menu-view";
import { PageHero } from "@/modules/public/components/page-hero";
import { VisitCta } from "@/modules/public/components/visit-cta";
import { getPublicMenu } from "@/modules/public/data/menu";
import { restaurant } from "@/shared/config/restaurant";
import { ButtonLink } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/surface";

export const metadata: Metadata = {
  title: "Menu",
  description: `The full menu at ${restaurant.name} — fish, prawns, curries, thali and more.`,
};

export const revalidate = 300;

export default async function MenuPage() {
  const sections = await getPublicMenu();

  return (
    <>
      <PageHero
        eyebrow="Daily Fresh Catch"
        title={
          <>
            What we&apos;re
            <span className="mt-1 block italic text-spice-200">cooking today.</span>
          </>
        }
        description="Freshly cooked fish & prawns made to order. Anything marked sold out has run out for today — the catch decides!"
      />

      <section className="min-h-[60vh] bg-foam">
        {sections.length === 0 ? (
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
            <EmptyState
              className="bg-white"
              title="The menu is being updated"
              description="Today's fresh catch is being updated in the kitchen. Call us or visit directly!"
              action={<ButtonLink href="/contact">Call us instead</ButtonLink>}
            />
          </div>
        ) : (
          <MenuView sections={sections} />
        )}
      </section>

      <VisitCta
        title="Come and eat"
        description={`Walk in, or call ${restaurant.phone} and we will keep a table for you.`}
      />
    </>
  );
}
