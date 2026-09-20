import type { ReactNode } from "react";

import { cn } from "@/shared/ui/cn";

import { Ornament } from "./ornament";

export function Section({
  children,
  className,
  tone = "light",
}: {
  children: ReactNode;
  className?: string;
  tone?: "light" | "sand" | "deep";
}) {
  const tones = {
    light: "bg-foam text-slate-900",
    sand: "bg-pearl text-slate-900",
    deep: "bg-ink text-brand-100",
  }[tone];

  return (
    <section className={cn(tones, className)}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "light",
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  align?: "center" | "left";
  tone?: "light" | "deep";
}) {
  return (
    <div
      className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "text-left")}
    >
      {eyebrow ? (
        <p
          className={cn(
            "text-xs font-semibold tracking-[0.28em] uppercase",
            tone === "deep" ? "text-spice-300" : "text-spice-700",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <Ornament className={cn("mt-4", align === "center" && "justify-center")} />
      <h2
        className={cn(
          "mt-5 font-display text-3xl leading-tight font-semibold sm:text-5xl",
          tone === "deep" ? "text-white" : "text-ink",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed",
            tone === "deep" ? "text-brand-200" : "text-slate-600",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
