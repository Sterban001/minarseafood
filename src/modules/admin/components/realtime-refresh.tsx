"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/shared/supabase/client";
import { hasSupabaseEnv } from "@/shared/supabase/env";

type Props = {
  /** Unique per screen so two open screens don't share a channel. */
  channel: string;
  tables?: string[];
  /** Fallback poll in case the socket drops, in milliseconds. */
  pollMs?: number;
};

/**
 * Invisible. Listens to Postgres changes and re-renders the server components on
 * screen, so two waiters punching different tables see each other's work without
 * a refresh. Writes are ordinary server actions; this only handles reading.
 */
export function RealtimeRefresh({
  channel,
  tables = ["orders", "order_items"],
  pollMs = 30_000,
}: Props) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv) return;

    // A busy table can fire several events at once; coalesce them into one refresh.
    const refreshSoon = () => {
      if (pending.current) clearTimeout(pending.current);
      pending.current = setTimeout(() => router.refresh(), 250);
    };

    const supabase = createClient();
    const subscription = supabase.channel(channel);

    for (const table of tables) {
      subscription.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        refreshSoon,
      );
    }

    subscription.subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      if (pending.current) clearTimeout(pending.current);
      void supabase.removeChannel(subscription);
    };
  }, [channel, router, tables]);

  // Belt and braces: a tablet that sleeps on the floor tends to lose the socket.
  useEffect(() => {
    if (!pollMs) return;
    const timer = setInterval(() => router.refresh(), pollMs);
    return () => clearInterval(timer);
  }, [pollMs, router]);

  return (
    <span
      aria-hidden
      title={live ? "Live" : "Reconnecting"}
      className={`inline-block size-2 rounded-full ${
        live ? "bg-emerald-500" : "bg-slate-300"
      }`}
    />
  );
}
