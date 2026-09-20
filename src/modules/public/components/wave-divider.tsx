import { cn } from "@/shared/ui/cn";

export function WaveDivider({
  className,
  fill = "#f3eee3",
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <div className={cn("pointer-events-none -mb-px overflow-hidden leading-none", className)} aria-hidden>
      <svg
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        className="block h-[70px] w-full sm:h-[90px]"
      >
        <path
          fill={fill}
          d="M0 54c80-28 160-28 240 0s160 28 240 0 160-28 240 0 160 28 240 0 160-28 240 0 160 28 240 0v36H0z"
        />
      </svg>
    </div>
  );
}
