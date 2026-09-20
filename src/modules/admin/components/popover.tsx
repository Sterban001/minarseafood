"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { buttonClass, type ButtonSize, type ButtonVariant } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";

/**
 * Small anchored panel for the things that need a second thought — a void
 * reason, a discount amount, choosing a payment method. Closes on Escape or a
 * click outside so staff can back out of it with a stray tap.
 */
export function Popover({
  label,
  children,
  variant = "outline",
  size = "sm",
  align = "right",
  width = "w-72",
  className,
  disabled,
}: {
  label: ReactNode;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  align?: "left" | "right";
  width?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={buttonClass({ variant, size })}
      >
        {label}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-40 mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg",
            width,
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
