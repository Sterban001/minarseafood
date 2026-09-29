"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Minus, Plus, Printer, ShoppingCart, Trash2, X } from "lucide-react";

import { createSale, type CreateSaleResult, type SaleCartItem } from "@/modules/admin/sales/actions";
import type { CategoryWithItems } from "@/modules/admin/sales/queries";
import { formatMoney } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";

type CartLine = SaleCartItem & { lineTotal: number };

export function QuickSaleView({ categories }: { categories: CategoryWithItems[] }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const [result, setResult] = useState<CreateSaleResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = cart.reduce((sum, line) => sum + line.lineTotal, 0);
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);

  const addItem = useCallback(
    (menuItemId: string, name: string, price: number) => {
      setCart((prev) => {
        const existing = prev.find((line) => line.menuItemId === menuItemId);
        if (existing) {
          return prev.map((line) =>
            line.menuItemId === menuItemId
              ? { ...line, qty: line.qty + 1, lineTotal: (line.qty + 1) * line.price }
              : line,
          );
        }
        return [...prev, { menuItemId, name, price, qty: 1, lineTotal: price }];
      });
      setResult(null);
    },
    [],
  );

  const updateQty = useCallback((menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.menuItemId !== menuItemId) return line;
          const newQty = line.qty + delta;
          if (newQty <= 0) return null;
          return { ...line, qty: newQty, lineTotal: newQty * line.price };
        })
        .filter(Boolean) as CartLine[],
    );
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setCart((prev) => prev.filter((line) => line.menuItemId !== menuItemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setResult(null);
  }, []);

  const handleCharge = () => {
    if (!cart.length || isPending) return;
    startTransition(async () => {
      const res = await createSale(cart);
      setResult(res);
      if (res.ok) setCart([]);
    });
  };

  const handleNewSale = () => {
    setResult(null);
    setCart([]);
  };

  // Success state
  if (result?.ok) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
        <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="size-10 text-emerald-600" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900">
            Sale #{result.saleNo}
          </h2>
          <p className="mt-1 text-slate-500">Payment received</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/receipt/${result.saleId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-800"
          >
            <Printer className="size-4" aria-hidden />
            Print Receipt
          </Link>
          <Button variant="outline" onClick={handleNewSale}>
            Next Sale
          </Button>
        </div>
      </div>
    );
  }

  const activeCat = categories.find((c) => c.id === activeCategory);

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col lg:h-[calc(100dvh-4rem)] lg:flex-row">
      {/* Menu grid area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Category pills */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-slate-200 px-1 py-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                activeCategory === cat.id
                  ? "bg-brand-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {cat.name}
              <span className="ml-1.5 text-xs opacity-70">
                {cat.items.length}
              </span>
            </button>
          ))}
        </div>

        {/* Item grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {(activeCat?.items ?? []).map((item) => {
              const inCart = cart.find((l) => l.menuItemId === item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item.id, item.name, item.price)}
                  className={cn(
                    "relative flex flex-col items-start rounded-xl border p-3 text-left transition-all active:scale-[0.97]",
                    inCart
                      ? "border-brand-300 bg-brand-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
                  )}
                >
                  <span className="text-sm font-medium text-slate-900 leading-snug">
                    {item.name}
                  </span>
                  <span className="mt-1 text-sm font-semibold text-brand-700 tabular-nums">
                    {formatMoney(item.price)}
                  </span>
                  {inCart ? (
                    <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                      {inCart.qty}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart sidebar (desktop) / bottom panel (mobile) */}
      <div className="flex w-full flex-col border-t border-slate-200 bg-slate-50 lg:w-80 lg:border-t-0 lg:border-l xl:w-96">
        {/* Cart header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">
              Cart ({itemCount})
            </span>
          </div>
          {cart.length > 0 ? (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-medium text-red-600 hover:text-red-700"
            >
              Clear
            </button>
          ) : null}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <ShoppingCart className="size-8" />
              <p className="text-sm">Tap items to add</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {cart.map((line) => (
                <li
                  key={line.menuItemId}
                  className="flex items-center gap-2 rounded-lg bg-white p-2.5 shadow-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{line.name}</p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {formatMoney(line.price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQty(line.menuItemId, -1)}
                      className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(line.menuItemId, 1)}
                      className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <span className="w-16 text-right text-sm font-semibold text-slate-900 tabular-nums">
                    {formatMoney(line.lineTotal)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(line.menuItemId)}
                    className="ml-1 flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cart footer / charge button */}
        <div className="border-t border-slate-200 bg-white p-4">
          {result && !result.ok ? (
            <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
              {result.error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={cart.length === 0 || isPending}
            onClick={handleCharge}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold transition-all",
              cart.length > 0
                ? "bg-brand-700 text-white shadow-md hover:bg-brand-800 active:scale-[0.98]"
                : "cursor-not-allowed bg-slate-200 text-slate-400",
            )}
          >
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing…
              </span>
            ) : (
              <>Charge {formatMoney(total)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
