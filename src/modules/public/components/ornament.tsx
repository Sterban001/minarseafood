import { cn } from "@/shared/ui/cn";

export function Ornament({ className, tone = "gold" }: { className?: string; tone?: "gold" | "foam" }) {
  const color = tone === "foam" ? "bg-brand-100/70" : "bg-spice-400";

  return (
    <div className={cn("flex items-center gap-3", className)} aria-hidden>
      <span className={cn("h-px w-10", color)} />
      <span className={cn("size-1.5 rotate-45", color)} />
      <span className={cn("h-px w-10", color)} />
    </div>
  );
}
