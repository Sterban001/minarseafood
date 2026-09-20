"use client";

import { Printer } from "lucide-react";

import { Button } from "@/shared/ui/button";

/** Hands the bill to whatever printer the tablet or till is already using. */
export function PrintButton() {
  return (
    <Button variant="primary" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      Print
    </Button>
  );
}
