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
      {!compact ? <Waves /> : null}
      {!compact ? <FishSchool /> : null}
      <div className="grain" />
      <div className="absolute inset-0 bg-linear-to-t from-ink/60 via-transparent to-ink/30" />
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

function PomfretFish() {
  return (
    <svg viewBox="0 0 200 110" className="h-full w-full drop-shadow-sm" fill="currentColor">
      <path d="M 20,55 C 35,20 90,10 135,35 C 160,50 170,55 185,55 C 170,55 160,60 135,75 C 90,100 35,90 20,55 Z" />
      <path d="M 75,18 C 105,2 140,15 130,37 C 115,25 90,20 75,18 Z" opacity="0.8" />
      <path d="M 75,92 C 105,108 140,95 130,73 C 115,85 90,90 75,92 Z" opacity="0.8" />
      <g className="tail-wiggle" style={{ transformOrigin: "170px 55px" }}>
        <path d="M 170,55 L 198,25 C 190,45 190,65 198,85 Z" opacity="0.9" />
      </g>
      <path d="M 70,58 C 85,62 98,72 90,80 C 80,82 72,72 70,58 Z" opacity="0.7" />
      <path d="M 52,38 C 60,48 60,62 52,72" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.35" strokeLinecap="round" />
      <circle cx="38" cy="46" r="5" />
      <circle cx="39.5" cy="44.8" r="2" fill="#021014" />
    </svg>
  );
}

function MackerelFish() {
  return (
    <svg viewBox="0 0 220 80" className="h-full w-full drop-shadow-sm" fill="currentColor">
      <path d="M 15,40 C 35,22 95,18 150,32 C 175,38 185,40 195,40 C 185,40 175,42 150,48 C 95,62 35,58 15,40 Z" />
      <path d="M 80,21 L 105,8 L 115,23 Z" opacity="0.75" />
      <path d="M 125,24 L 140,15 L 145,26 Z" opacity="0.65" />
      <g className="tail-wiggle" style={{ transformOrigin: "185px 40px" }}>
        <path d="M 185,40 L 215,18 C 205,33 205,47 215,62 Z" />
      </g>
      <path d="M 65,42 C 80,45 92,54 84,60 C 74,60 67,52 65,42 Z" opacity="0.65" />
      <path d="M 48,28 C 55,35 55,45 48,52" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
      <circle cx="32" cy="36" r="4.5" />
      <circle cx="33.2" cy="35" r="1.8" fill="#021014" />
    </svg>
  );
}

function SeabassFish() {
  return (
    <svg viewBox="0 0 240 100" className="h-full w-full drop-shadow-sm" fill="currentColor">
      <path d="M 20,50 C 40,20 110,12 165,38 C 190,48 200,50 215,50 C 200,50 190,52 165,62 C 110,88 40,80 20,50 Z" />
      <path d="M 70,22 C 100,5 145,12 155,34 C 130,28 95,24 70,22 Z" opacity="0.85" />
      <g className="tail-wiggle" style={{ transformOrigin: "205px 50px" }}>
        <path d="M 205,50 L 235,20 C 225,40 225,60 235,80 Z" opacity="0.9" />
      </g>
      <circle cx="42" cy="42" r="5.5" />
      <circle cx="43.5" cy="40.5" r="2.2" fill="#021014" />
    </svg>
  );
}

function FishSchool() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[38%] overflow-hidden" aria-hidden>
      {/* Fish 1: Lower Wave Swell Left */}
      <div
        className="pointer-events-none absolute bottom-[26%] left-[8%] h-11 w-26 text-brand-100/50 swim-local-right sm:h-13 sm:w-30"
        style={{ animationDuration: "13s" }}
      >
        <PomfretFish />
      </div>

      {/* Fish 2: Lower Wave Swell Mid-Left */}
      <div
        className="pointer-events-none absolute bottom-[22%] left-[26%] h-8 w-22 text-spice-200/45 swim-local-left sm:h-9 sm:w-26"
        style={{ animationDuration: "15s", animationDelay: "-3s" }}
      >
        <MackerelFish />
      </div>

      {/* Fish 3: Lower Wave Swell Center */}
      <div
        className="pointer-events-none absolute bottom-[25%] left-[45%] h-12 w-28 text-teal-100/45 swim-local-left sm:h-14 sm:w-32"
        style={{ animationDuration: "16s", animationDelay: "-7s" }}
      >
        <PomfretFish />
      </div>

      {/* Fish 4: Lower Wave Swell Mid-Right */}
      <div
        className="pointer-events-none absolute bottom-[18%] left-[64%] h-9 w-24 text-brand-200/40 swim-local-right sm:h-10 sm:w-28"
        style={{ animationDuration: "14s", animationDelay: "-2s" }}
      >
        <MackerelFish />
      </div>

      {/* Fish 5: Lower Wave Swell Right (Near Logo water) */}
      <div
        className="pointer-events-none absolute bottom-[22%] right-[10%] h-14 w-36 text-spice-100/45 swim-local-left sm:h-16 sm:w-40"
        style={{ animationDuration: "17s", animationDelay: "-6s" }}
      >
        <SeabassFish />
      </div>

      {/* Fish 6: Deep Bottom Ocean Center */}
      <div
        className="pointer-events-none absolute bottom-[8%] left-[52%] h-12 w-30 text-teal-100/35 swim-local-right sm:h-14 sm:w-34"
        style={{ animationDuration: "18s", animationDelay: "-5s" }}
      >
        <SeabassFish />
      </div>
    </div>
  );
}

function Waves() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 sm:h-64" aria-hidden>
      {/* Shared Gradient Defs */}
      <svg className="absolute h-0 w-0 overflow-hidden" aria-hidden>
        <defs>
          <linearGradient id="ocean-grad-1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#032b30" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="ocean-grad-2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#051f24" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="ocean-grad-3" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#021316" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="ocean-foam-glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>

      {/* Deep Ocean Back Swell */}
      <svg
        className="ocean-wave-slow absolute bottom-0 h-full w-[200%]"
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
      >
        <path
          fill="url(#ocean-grad-1)"
          d="M0,96 C280,160 480,32 720,96 C960,160 1160,32 1440,96 L1440,220 L0,220 Z"
        />
        <path
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeOpacity="0.35"
          d="M0,96 C280,160 480,32 720,96 C960,160 1160,32 1440,96"
        />
      </svg>

      {/* Mid Bioluminescent Wave (Counter-Wave) */}
      <svg
        className="ocean-wave-reverse absolute bottom-0 h-[85%] w-[200%]"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
      >
        <path
          fill="url(#ocean-grad-2)"
          d="M0,70 C320,20 540,120 720,70 C900,20 1120,120 1440,70 L1440,200 L0,200 Z"
        />
        <path
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="2"
          strokeOpacity="0.55"
          d="M0,70 C320,20 540,120 720,70 C900,20 1120,120 1440,70"
        />
      </svg>

      {/* Foreground Rolling Crest Wave */}
      <svg
        className="ocean-wave absolute bottom-0 h-[65%] w-[200%]"
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
      >
        <path
          fill="url(#ocean-grad-3)"
          d="M0,50 C240,110 480,10 720,50 C960,110 1200,10 1440,50 L1440,160 L0,160 Z"
        />
        <path
          fill="none"
          stroke="url(#ocean-foam-glow)"
          strokeWidth="2.5"
          d="M0,50 C240,110 480,10 720,50 C960,110 1200,10 1440,50"
        />
      </svg>

      {/* Floating Sea Bubbles & Light Caustics */}
      <OceanBubbles />
    </div>
  );
}

function OceanBubbles() {
  const bubbles = [
    { left: "8%", size: "6px", delay: "0s", duration: "7s" },
    { left: "22%", size: "4px", delay: "2.2s", duration: "9.5s" },
    { left: "38%", size: "7px", delay: "1.1s", duration: "6.5s" },
    { left: "54%", size: "5px", delay: "3.5s", duration: "8.5s" },
    { left: "68%", size: "8px", delay: "0.8s", duration: "7.2s" },
    { left: "82%", size: "4px", delay: "2.8s", duration: "10s" },
    { left: "94%", size: "6px", delay: "1.7s", duration: "6.2s" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="ocean-bubble absolute bottom-0 rounded-full bg-cyan-200/40 shadow-[0_0_8px_rgba(56,189,248,0.7)]"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            animationDelay: b.delay,
            animationDuration: b.duration,
          }}
        />
      ))}
    </div>
  );
}
