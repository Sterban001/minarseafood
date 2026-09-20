import type { ComponentProps, ReactNode } from "react";

import { cn } from "./cn";

const fieldBase =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:outline-2 focus:outline-offset-0 focus:outline-brand-500/40 disabled:bg-slate-50 disabled:text-slate-500";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-20", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldBase, "pr-8", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold tracking-wide text-slate-600 uppercase"
      >
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

export function FormMessage({
  status,
  children,
}: {
  status: "error" | "success" | "info";
  children: ReactNode;
}) {
  const tone = {
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    info: "border-slate-200 bg-slate-50 text-slate-600",
  }[status];

  return (
    <p className={cn("rounded-lg border px-3 py-2 text-sm", tone)} role="status">
      {children}
    </p>
  );
}
