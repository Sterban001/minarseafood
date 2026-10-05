"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/shared/ui/button";

interface PrintButtonProps {
  autoPrint?: boolean;
}

/** Hands the receipt to whatever printer the tablet or till is already using. */
export function PrintButton({ autoPrint = false }: PrintButtonProps) {
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <Button variant="primary" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      Print
    </Button>
  );
}

