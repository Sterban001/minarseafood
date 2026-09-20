"use client";

import { useActionState, type ReactNode } from "react";

import type { ActionResult } from "@/modules/admin/lib/action-result";
import { cn } from "@/shared/ui/cn";

export type ServerAction = (form: FormData) => Promise<ActionResult>;

type Props = {
  action: ServerAction;
  children: ReactNode;
  className?: string;
  /** Show the success message, not just failures. Off by default to stay quiet. */
  announceSuccess?: boolean;
  messageClassName?: string;
};

/**
 * Wraps a server action so whatever it says comes back on screen. Every write in
 * the panel goes through one of these, which is why no action needs to throw at
 * the user.
 */
export function ActionForm({
  action,
  children,
  className,
  announceSuccess,
  messageClassName,
}: Props) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    async (_previous, form) => action(form),
    undefined,
  );

  const message = state
    ? state.ok
      ? announceSuccess
        ? state.message
        : undefined
      : state.error
    : undefined;

  return (
    <form action={formAction} className={className}>
      {children}
      {message ? (
        <p
          className={cn(
            "mt-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
            state?.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700",
            messageClassName,
          )}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
