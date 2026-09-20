import type { ReactNode } from "react";

import { cn } from "./cn";

export type Column<T> = {
  /** React key for the column, and the CSV header when one is derived from it. */
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  /** Dropped on phones, where there is no room for the secondary columns. */
  secondary?: boolean;
};

/**
 * Dense read-only table for the reporting screens. Scrolls sideways rather than
 * wrapping, because a bill list with wrapped cells is unreadable on a tablet.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  emptyLabel = "Nothing in this period.",
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="no-scrollbar overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-3 py-2 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase",
                  column.align === "right" && "text-right",
                  column.secondary && "hidden sm:table-cell",
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="transition-colors hover:bg-slate-50">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "px-3 py-2 text-slate-700",
                    column.align === "right" && "text-right tabular-nums",
                    column.secondary && "hidden sm:table-cell",
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
