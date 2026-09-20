import Image from "next/image";

import { cn } from "@/shared/ui/cn";

/**
 * Renders a real photo when one exists and a typographic tile when it does not,
 * so the site looks finished before any photography is shot. Drop files into
 * `public/gallery/` and set `src` in `src/shared/config/gallery.ts`.
 */
export function PhotoTile({
  src,
  alt,
  caption,
  label,
  className,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority,
}: {
  src?: string;
  alt?: string;
  caption?: string;
  /** Short word shown on the fallback tile, e.g. the dish or room name. */
  label?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <figure
      className={cn(
        "group relative overflow-hidden rounded-3xl bg-brand-900 ring-1 ring-white/10",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt ?? caption ?? ""}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <FallbackArt label={caption ? undefined : (label ?? caption)} />
      )}

      {caption ? (
        <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/90 via-ink/40 to-transparent px-5 pt-16 pb-4 text-sm font-medium text-white">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

const palettes = [
  ["#0b3a42", "#165a62", "#c4892a"],
  ["#0a2c38", "#1d4f56", "#d4a574"],
  ["#123048", "#22626a", "#e0a336"],
  ["#0e2430", "#267b83", "#bf6a19"],
];

function FallbackArt({ label }: { label?: string }) {
  const seed = [...(label ?? "minar")].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [deep, mid, gold] = palettes[seed % palettes.length];

  return (
    <div aria-hidden className="absolute inset-0" style={{ background: deep }}>
      <div
        className="absolute -top-16 -right-10 size-56 rounded-full blur-3xl"
        style={{ background: gold, opacity: 0.22 }}
      />
      <div
        className="absolute -bottom-20 -left-12 size-64 rounded-full blur-3xl"
        style={{ background: mid, opacity: 0.55 }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 400 300" preserveAspectRatio="none">
        <path
          fill={mid}
          d="M0 220c40-22 80-22 120 0s80 22 120 0 80-22 160 0v80H0z"
        />
        <path
          fill={deep}
          opacity="0.6"
          d="M0 250c50-18 90-10 140 6s90 10 140-8 80-16 120 4v48H0z"
        />
      </svg>
      <svg
        className="absolute top-1/2 left-1/2 h-16 w-28 -translate-x-1/2 -translate-y-[70%] opacity-40"
        viewBox="0 0 120 48"
        style={{ color: gold }}
      >
        <path
          fill="currentColor"
          d="M8 24c10-16 34-22 62-14 14 4 24 10 34 10l-8 8 8 8c-10 0-20 6-34 10C42 54 18 48 8 32c6 0 10-4 10-8S14 24 8 24zm36-4c0-3 3-5 6-5s6 2 6 5-3 5-6 5-6-2-6-5z"
        />
      </svg>
      {label ? (
        <span className="absolute inset-x-0 top-[54%] px-6 text-center font-display text-2xl font-semibold text-white/35">
          {label}
        </span>
      ) : null}
    </div>
  );
}
