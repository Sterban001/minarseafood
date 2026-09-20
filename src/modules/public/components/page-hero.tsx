import type { ReactNode } from "react";

import { OceanScene } from "./ocean-scene";
import { Ornament } from "./ornament";
import { WaveDivider } from "./wave-divider";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-ink pt-28 text-white sm:pt-32">
      <OceanScene compact />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <p className="text-xs font-semibold tracking-[0.32em] text-spice-300 uppercase">
          {eyebrow}
        </p>
        <Ornament className="mt-5" />
        <h1 className="mt-5 max-w-3xl font-display text-4xl leading-[1.1] font-semibold text-white sm:text-6xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-100/90 sm:text-lg">
            {description}
          </p>
        ) : null}
        {children}
      </div>
      <WaveDivider className="relative" fill="#f3eee3" />
    </section>
  );
}
