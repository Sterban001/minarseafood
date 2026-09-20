import type { Metadata } from "next";

import { PageHero } from "@/modules/public/components/page-hero";
import { PhotoTile } from "@/modules/public/components/photo-tile";
import { VisitCta } from "@/modules/public/components/visit-cta";
import { galleryPhotos } from "@/shared/config/gallery";
import { restaurant } from "@/shared/config/restaurant";
import { cn } from "@/shared/ui/cn";

export const metadata: Metadata = {
  title: "Gallery",
  description: `Inside ${restaurant.name} — the kitchen and the plates.`,
};

export default function GalleryPage() {
  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title={
          <>
            A look
            <span className="mt-1 block italic text-spice-200">inside.</span>
          </>
        }
        description="The kitchen and the plates that come out of it."
      />

      <section className="bg-foam">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {galleryPhotos.map((photo) => (
              <PhotoTile
                key={photo.caption}
                src={photo.src}
                alt={photo.alt}
                caption={photo.caption}
                label={photo.caption}
                className={cn("aspect-4/3 min-h-56", photo.wide && "lg:col-span-2")}
              />
            ))}
          </div>
        </div>
      </section>

      <VisitCta />
    </>
  );
}
