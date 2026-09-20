import type { Metadata } from "next";

import { DishRow } from "@/modules/public/components/dish-card";
import { PageHero } from "@/modules/public/components/page-hero";
import { SectionHeading } from "@/modules/public/components/section";
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
        eyebrow="Menu"
        title={
          <>
            What we&apos;re
            <span className="mt-1 block italic text-spice-200">cooking today.</span>
          </>
        }
        description="Prices are per plate and include everything. Anything marked sold out has run out for today — the catch decides, not us."
      >
        {sections.length > 1 ? (
          <nav className="no-scrollbar mt-8 flex gap-2 overflow-x-auto pb-1">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${slug(section.name)}`}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm whitespace-nowrap text-brand-50 backdrop-blur transition-colors hover:bg-white/15"
              >
                {section.name}
              </a>
            ))}
          </nav>
        ) : null}
      </PageHero>

      <section className="bg-foam">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          {sections.length === 0 ? (
            <EmptyState
              className="bg-white"
              title="The menu is not published yet"
              description="The menu will show here once dishes are listed."
              action={<ButtonLink href="/contact">Call us instead</ButtonLink>}
            />
          ) : (
            <div className="space-y-16">
              {sections.map((section) => (
                <div key={section.id} id={slug(section.name)} className="scroll-mt-28">
                  <SectionHeading align="left" title={section.name} />
                  <ul className="mt-6 divide-y divide-brand-950/8 border-y border-brand-950/8">
                    {section.items.map((dish) => (
                      <DishRow key={dish.id} dish={dish} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <VisitCta
        title="Come and eat"
        description={`Walk in, or call ${restaurant.phone} and we will keep a table for you.`}
      />
    </>
  );
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
