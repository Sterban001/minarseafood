import { cn } from "@/shared/ui/cn";

/** Night sky, water, and a Charminar-like minar — atmosphere only, no photos. */
export function OceanScene({ compact = false }: { compact?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-linear-to-b from-[#021014] via-[#072428] to-[#0a3a40]" />
      <div className="ocean-caustic absolute -top-24 left-1/4 size-[36rem] rounded-full bg-brand-500/20 blur-3xl" />
      <div className="ocean-pulse absolute top-10 right-[-6rem] size-[28rem] rounded-full bg-spice-500/15 blur-3xl" />
      <div className="absolute bottom-0 left-[-8rem] size-[32rem] rounded-full bg-brand-400/10 blur-3xl" />

      <Stars />
      {!compact ? <Minar /> : null}
      {!compact ? <FishSchool /> : null}
      {!compact ? <Waves /> : null}
      <div className="grain" />
      <div className="absolute inset-0 bg-linear-to-t from-ink/80 via-transparent to-ink/40" />
    </div>
  );
}

function Stars() {
  const stars = [
    [8, 12, 1.6, "0s"],
    [18, 22, 1.1, "0.4s"],
    [27, 8, 1.4, "1.1s"],
    [36, 18, 0.9, "0.2s"],
    [44, 6, 1.3, "1.6s"],
    [52, 26, 1, "0.8s"],
    [61, 14, 1.5, "1.9s"],
    [69, 9, 0.8, "0.3s"],
    [76, 21, 1.2, "1.3s"],
    [84, 11, 1.7, "0.6s"],
    [91, 28, 1, "2.1s"],
    [14, 34, 0.9, "1.4s"],
    [41, 32, 1.1, "0.9s"],
    [88, 7, 1.2, "1.7s"],
    [6, 48, 0.8, "2.4s"],
    [96, 18, 1.3, "0.5s"],
  ] as const;

  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
      {stars.map(([x, y, r, delay], i) => (
        <circle
          key={i}
          className="ocean-star"
          cx={x}
          cy={y}
          r={r * 0.12}
          fill="#f8ecce"
          style={{ animationDelay: delay }}
        />
      ))}
    </svg>
  );
}

function Minar() {
  return (
    <svg
      className="absolute right-[-8%] bottom-[8%] hidden h-[78%] w-[52%] text-brand-950/55 lg:block"
      viewBox="0 0 280 520"
      preserveAspectRatio="xMaxYMax meet"
    >
      <path
        fill="currentColor"
        d="M132 20c-6 28-8 56-8 84h32c0-28-2-56-8-84-5 8-11 8-16 0zm-28 84 16 22h56l16-22H104zm8 22v28h88v-28H112zm-12 28 12 18h80l12-18H100zm16 18v250h80V172h-80zm-20 250 20 18h100l20-18H96zm12 18v48h116v-48H108zm-8 48h132v14H100v-14zm36-280h8v200h-8V208zm52 0h8v200h-8V208zM132 40c18 0 22 14 28 8-8 18-20 22-28 22s-20-4-28-22c6 6 10-8 28-8z"
      />
      <path
        fill="currentColor"
        opacity="0.55"
        d="M40 300c8-40 28-70 44-78 2 18 4 48 2 78H40zm156 0c-2-30 0-60 2-78 16 8 36 38 44 78h-46z"
      />
    </svg>
  );
}

function FishSilhouette() {
  return (
    <svg viewBox="0 0 220 100" className="h-full w-full" fill="currentColor">
      <path d="M14 50c2-17 26-30 68-27 32 3 54 14 66 25-12 11-34 24-66 27C40 78 16 67 14 50Z" />
      <path d="M84 24 114 4l14 22c-10-3-18-4-26-2Z" />
      <path d="M94 74 118 94l12-18c-8 2-16 2-22 1Z" />
      <path d="M146 48 212 16 174 50 212 84 146 52Z" />
      <path d="M70 54 94 74 76 56Z" />
      <path
        d="M54 36c8 5 9 17 0 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <circle cx="40" cy="44" r="6" />
      <circle cx="41.8" cy="42.8" r="2.4" fill="#031518" />
    </svg>
  );
}

function SwimmingFish({
  className,
  flip,
  duration,
  delay,
  swimX,
  swimY,
  tilt,
}: {
  className?: string;
  flip?: boolean;
  duration: string;
  delay: string;
  swimX: string;
  swimY: string;
  tilt: string;
}) {
  return (
    <div className={cn("pointer-events-none absolute", className)}>
      <div className={cn("h-full w-full", flip && "-scale-x-100")}>
        <div
          className="ocean-swim h-full w-full"
          style={
            {
              animationDuration: duration,
              animationDelay: delay,
              "--swim-x": swimX,
              "--swim-y": swimY,
              "--swim-tilt": tilt,
            } as React.CSSProperties
          }
        >
          <FishSilhouette />
        </div>
      </div>
    </div>
  );
}

function FishSchool() {
  return (
    <>
      <SwimmingFish
        className="bottom-[22%] left-[2%] h-14 w-32 text-brand-100/40 sm:h-16 sm:w-40"
        duration="16s"
        delay="0s"
        swimX="18%"
        swimY="-16px"
        tilt="-6deg"
      />
      <SwimmingFish
        className="bottom-[10%] left-[14%] h-10 w-24 text-spice-100/32 sm:h-12 sm:w-28"
        duration="13s"
        delay="-4s"
        swimX="22%"
        swimY="-20px"
        tilt="-8deg"
      />
      <SwimmingFish
        className="bottom-[17%] left-[34%] h-8 w-20 text-brand-100/28 sm:h-10 sm:w-24"
        flip
        duration="19s"
        delay="-9s"
        swimX="15%"
        swimY="-12px"
        tilt="-5deg"
      />
      <SwimmingFish
        className="bottom-[32%] left-[6%] hidden h-7 w-16 text-brand-50/22 sm:block"
        duration="12s"
        delay="-2s"
        swimX="20%"
        swimY="-18px"
        tilt="-7deg"
      />
      <SwimmingFish
        className="right-[6%] bottom-[14%] hidden h-12 w-28 text-spice-100/28 lg:block"
        flip
        duration="17s"
        delay="-11s"
        swimX="16%"
        swimY="-14px"
        tilt="-6deg"
      />
      <SwimmingFish
        className="right-[22%] bottom-[8%] hidden h-8 w-20 text-brand-100/24 sm:block"
        duration="14s"
        delay="-6s"
        swimX="19%"
        swimY="-22px"
        tilt="-9deg"
      />
      <SwimmingFish
        className="right-[18%] bottom-[26%] hidden h-9 w-20 text-spice-50/22 lg:block"
        flip
        duration="21s"
        delay="-15s"
        swimX="12%"
        swimY="-10px"
        tilt="-4deg"
      />
    </>
  );
}

function Waves() {
  return (
    <div className="absolute inset-x-0 bottom-0 h-40 sm:h-52">
      <svg className="absolute bottom-0 h-full w-[200%] ocean-wave-slow text-brand-800/70" viewBox="0 0 1440 160" preserveAspectRatio="none">
        <path
          fill="currentColor"
          d="M0 80c120-40 240-40 360 0s240 40 360 0 240-40 360 0 240 40 360 0v80H0z"
        />
      </svg>
      <svg className="absolute bottom-0 h-[80%] w-[200%] ocean-wave text-brand-900/80" viewBox="0 0 1440 160" preserveAspectRatio="none">
        <path
          fill="currentColor"
          d="M0 90c140-50 220-20 360 0s240 40 360-10 220-50 360 10 240 30 360-10v80H0z"
        />
      </svg>
      <svg className="absolute bottom-0 h-[55%] w-[200%] ocean-wave-slow text-ink" viewBox="0 0 1440 160" preserveAspectRatio="none" style={{ animationDuration: "22s" }}>
        <path
          fill="currentColor"
          d="M0 100c100-30 260-60 360-20s200 50 360 10 280-40 360 10 220 40 360 0v60H0z"
        />
      </svg>
    </div>
  );
}
