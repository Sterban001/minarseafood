"use client";

import { useEffect, useState } from "react";

import { formatElapsed } from "@/shared/lib/dates";

/**
 * Ticking "how long has this table been sitting" clock. Client-side because the
 * value has to keep moving without a request, and because a server-rendered
 * number would be stale the moment it arrived.
 */
export function Elapsed({ since }: { since: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!since) return null;
  return <span suppressHydrationWarning>{formatElapsed(since, now)}</span>;
}
