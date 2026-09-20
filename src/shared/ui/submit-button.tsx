"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "./button";

/**
 * Disables itself while the enclosing `<form action={...}>` is in flight, so a
 * waiter tapping twice can't double-punch an item.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? (pendingLabel ?? "Working…") : children}
    </Button>
  );
}
