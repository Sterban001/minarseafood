import Image from "next/image";

import { restaurant } from "@/shared/config/restaurant";
import { cn } from "@/shared/ui/cn";

/** Circular house mark. Pair with the wordmark, or pass `alt` when it stands alone. */
export function SiteLogo({
  className,
  priority,
  alt = restaurant.displayName,
  width = 160,
  height = 160,
}: {
  className?: string;
  priority?: boolean;
  alt?: string;
  width?: number;
  height?: number;
}) {
  return (
    <Image
      src={restaurant.logo}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn("rounded-full object-contain", className)}
    />
  );
}
