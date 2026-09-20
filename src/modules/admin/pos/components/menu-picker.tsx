"use client";

import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";

import { formatMoney } from "@/shared/lib/money";
import { Input } from "@/shared/ui/form";
import { cn } from "@/shared/ui/cn";

import { addItem } from "../actions";
import type { PosMenu } from "../queries";

/**
 * Tap-to-add pad. Category tabs and search filter locally so a busy waiter never
 * waits on the network to find a dish; only the tap itself hits the server.
 */
export function MenuPicker({
  orderId,
  menu,
  disabled,
}: {
  orderId: string;
  menu: PosMenu;
  disabled?: boolean;
}) {
  const [categoryId, setCategoryId] = useState<string>(menu.categories[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const searching = query.trim().length > 0;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle) {
      return menu.items.filter((item) => item.name.toLowerCase().includes(needle));
    }
    return menu.items.filter((item) => item.category_id === categoryId);
  }, [categoryId, menu.items, query]);

  const add = (menuItemId: string) => {
    if (disabled) return;
    setError(null);
    setAdding(menuItemId);

    const form = new FormData();
    form.set("orderId", orderId);
    form.set("menuItemId", menuItemId);

    startTransition(async () => {
      const result = await addItem(form);
      setAdding(null);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the whole menu…"
          className="pl-9"
          aria-label="Search the menu"
        />
      </div>

      {searching ? null : (
        <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {menu.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                category.id === categoryId
                  ? "bg-brand-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {visible.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled || !item.is_available || adding === item.id}
            onClick={() => add(item.id)}
            className={cn(
              "flex h-20 flex-col justify-between rounded-xl border p-2.5 text-left transition-colors",
              item.is_available
                ? "border-slate-200 bg-white hover:border-brand-400 hover:bg-brand-50 active:bg-brand-100"
                : "border-slate-200 bg-slate-50 opacity-60",
              adding === item.id && "border-brand-500 bg-brand-50",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span className="line-clamp-2 text-sm leading-tight font-medium text-slate-800">
              {item.name}
            </span>
            <span className="flex items-baseline justify-between gap-1">
              <span className="text-sm font-semibold text-brand-700 tabular-nums">
                {formatMoney(item.price)}
              </span>
              {item.is_available ? null : (
                <span className="text-[0.65rem] font-semibold tracking-wide text-red-600 uppercase">
                  out
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          {searching ? `Nothing matches “${query}”.` : "This category is empty."}
        </p>
      ) : null}
    </div>
  );
}
