"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Minus,
  Play,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

import { createSale, type CreateSaleResult, type SaleCartItem } from "@/modules/admin/sales/actions";
import type { CategoryWithItems, LiveTableInfo } from "@/modules/admin/sales/queries";
import type { BusinessDay, DiningTable } from "@/shared/types/database";
import { formatMoney } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";

type CartLine = SaleCartItem & { lineTotal: number };

export function QuickSaleView({
  categories,
  tables,
  liveTables = {},
  activeDay = null,
}: {
  categories: CategoryWithItems[];
  tables: DiningTable[];
  liveTables?: Record<string, LiveTableInfo>;
  activeDay?: BusinessDay | null;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const [orderType, setOrderType] = useState<"takeaway" | "table" | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [result, setResult] = useState<CreateSaleResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const categoriesRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkCategoryScroll = useCallback(() => {
    const el = categoriesRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkCategoryScroll();
    const t1 = setTimeout(checkCategoryScroll, 100);
    const t2 = setTimeout(checkCategoryScroll, 400);
    const el = categoriesRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkCategoryScroll, { passive: true });
    window.addEventListener("resize", checkCategoryScroll);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      el.removeEventListener("scroll", checkCategoryScroll);
      window.removeEventListener("resize", checkCategoryScroll);
    };
  }, [checkCategoryScroll, categories]);

  const scrollCategories = (direction: "left" | "right") => {
    const el = categoriesRef.current;
    if (!el) return;
    const amount = direction === "left" ? -280 : 280;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  const total = cart.reduce((sum, line) => sum + line.lineTotal, 0);
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);

  const selectedTableObj = tables.find((t) => t.id === selectedTable) ?? null;

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
      setValidationError(null);
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
    setOrderType(null);
    setSelectedTable(null);
    setResult(null);
    setValidationError(null);
  }, []);

  const handleSelectTakeaway = () => {
    setOrderType("takeaway");
    setSelectedTable(null);
    setTablePickerOpen(false);
    setValidationError(null);
  };

  const handleSelectTableMode = () => {
    setOrderType("table");
    setTablePickerOpen(true);
    setValidationError(null);
  };

  const handleSelectTable = (tableId: string) => {
    setOrderType("table");
    setSelectedTable(tableId);
    setTablePickerOpen(false);
    setValidationError(null);
  };

  const handleCharge = () => {
    if (!activeDay) {
      setValidationError("Business day is not started. Please start the day before recording sales.");
      window.dispatchEvent(new CustomEvent("minar:open-start-day"));
      return;
    }

    if (!cart.length || isPending) return;

    if (!orderType) {
      setValidationError("Please select Takeaway or Dine-In Table.");
      return;
    }

    if (orderType === "table" && !selectedTable) {
      setValidationError("Please select a table number for Dine-In.");
      return;
    }

    setValidationError(null);
    startTransition(async () => {
      const res = await createSale(cart, orderType === "table" ? selectedTable : null);
      setResult(res);
      if (res.ok) {
        setCart([]);
        setOrderType(null);
        setSelectedTable(null);
      }
    });
  };

  const handleNewSale = () => {
    setResult(null);
    setCart([]);
    setOrderType(null);
    setSelectedTable(null);
    setValidationError(null);
  };

  // Group tables by zone for the picker
  const tablesByZone = tables.reduce<Record<string, DiningTable[]>>((acc, t) => {
    (acc[t.zone] ??= []).push(t);
    return acc;
  }, {});

  // Success state
  if (result?.ok) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
        {/* Hidden iframe triggers automatic 1-click printing immediately when sale completes */}
        <iframe
          src={`/admin/receipt/${result.saleId}`}
          className="hidden"
          aria-hidden="true"
        />
        <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="size-10 text-emerald-600" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Sale #{result.saleNo}
          </h2>
          <p className="mt-1 text-sm font-medium text-emerald-600">
            ✓ Payment received • Print dialog launched
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={() => {
              const printWin = window.open(`/admin/receipt/${result.saleId}`, "_blank");
              printWin?.focus();
            }}
          >
            <Printer className="size-4" aria-hidden />
            Reprint Ticket
          </Button>
          <Button variant="outline" onClick={handleNewSale}>
            Next Sale
          </Button>
        </div>
      </div>
    );
  }

  const activeCat = categories.find((c) => c.id === activeCategory);
  const isReadyToCharge = Boolean(activeDay) && cart.length > 0 && orderType !== null && (orderType === "takeaway" || Boolean(selectedTable));

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col lg:h-[calc(100dvh-4rem)] lg:flex-row">
      {/* Menu grid area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!activeDay && (
          <div className="mx-2 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-200/70 text-amber-800">
                <AlertCircle className="size-4" />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900">Business Day is Not Started</p>
                <p className="text-xs text-amber-800">
                  Start the day to begin recording counter sales and billing tables.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("minar:open-start-day"));
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shrink-0"
            >
              <Play className="size-3.5 fill-current mr-1" />
              Start Day Now
            </Button>
          </div>
        )}
        {/* Category pills with permanent Left / Right buttons & mouse wheel support */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-2 py-2">
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => scrollCategories("left")}
            disabled={!canScrollLeft}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs transition-all",
              canScrollLeft
                ? "hover:bg-slate-100 hover:text-slate-900 active:scale-95 cursor-pointer"
                : "opacity-30 cursor-not-allowed text-slate-400 bg-slate-50",
            )}
            title="Scroll categories left"
            aria-label="Scroll categories left"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div
            ref={categoriesRef}
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 scroll-smooth touch-pan-x"
            style={{ scrollbarWidth: "thin" }}
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all whitespace-nowrap",
                  activeCategory === cat.id
                    ? "bg-brand-700 text-white shadow-xs scale-[1.02]"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                )}
              >
                {cat.name}
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-bold",
                    activeCategory === cat.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-600",
                  )}
                >
                  {cat.items.length}
                </span>
              </button>
            ))}
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => scrollCategories("right")}
            disabled={!canScrollRight}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs transition-all",
              canScrollRight
                ? "hover:bg-slate-100 hover:text-slate-900 active:scale-95 cursor-pointer"
                : "opacity-30 cursor-not-allowed text-slate-400 bg-slate-50",
            )}
            title="Scroll categories right"
            aria-label="Scroll categories right"
          >
            <ChevronRight className="size-5" />
          </button>
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

        {/* Order Type & Table Selection Section (Mandatory) */}
        <div className="border-b border-slate-200 px-4 py-3 bg-white space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Order Type <span className="text-red-500">*</span>
            </span>
            {orderType ? (
              <span className="text-xs font-medium text-brand-700">
                {orderType === "takeaway" ? "🛍️ Takeaway" : selectedTableObj ? `🍽️ Table ${selectedTableObj.label}` : "Select Table"}
              </span>
            ) : null}
          </div>

          {/* Segmented options: Takeaway vs Dine-In Table */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSelectTakeaway}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all",
                orderType === "takeaway"
                  ? "border-amber-400 bg-amber-50 text-amber-900 shadow-xs"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
              )}
            >
              🛍️ Takeaway
            </button>

            <button
              type="button"
              onClick={handleSelectTableMode}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all",
                orderType === "table"
                  ? "border-brand-400 bg-brand-50 text-brand-900 shadow-xs"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
              )}
            >
              🍽️ Table {selectedTableObj ? `(${selectedTableObj.label})` : ""}
            </button>
          </div>

          {selectedTable ? (
            <div className="flex items-center justify-between rounded-lg bg-brand-50/70 px-2.5 py-1.5 text-xs">
              <span className="font-semibold text-brand-800">Table {selectedTableObj?.label}</span>
              <Link
                href={`/admin/table-receipt/${selectedTable}`}
                target="_blank"
                className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-900 hover:underline"
              >
                <Printer className="size-3.5" />
                Print Full Table Bill
              </Link>
            </div>
          ) : null}

          {/* Table Picker Dropdown / Grid */}
          {orderType === "table" || tablePickerOpen ? (
            <div className="relative pt-1">
              <button
                type="button"
                onClick={() => setTablePickerOpen(!tablePickerOpen)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all",
                  selectedTable
                    ? "border-brand-300 bg-brand-50 font-semibold text-brand-800"
                    : "border-amber-300 bg-amber-50/50 text-amber-800 font-medium",
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="size-3.5 shrink-0" />
                  <span>
                    {selectedTableObj
                      ? `Table ${selectedTableObj.label} (${selectedTableObj.zone})`
                      : "Tap to select table number *"}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 transition-transform",
                    tablePickerOpen && "rotate-180",
                  )}
                />
              </button>

              {tablePickerOpen ? (
                <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  {tables.length === 0 ? (
                    <p className="p-2 text-center text-xs text-slate-500">
                      No active tables configured. Go to Admin &gt; Tables to add tables.
                    </p>
                  ) : (
                    Object.entries(tablesByZone).map(([zone, zoneTables]) => (
                      <div key={zone} className="mb-2 last:mb-0">
                        <div className="sticky top-0 bg-white px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
                          {zone}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {zoneTables.map((t) => {
                            const live = liveTables[t.id];
                            const isLive = Boolean(live?.isLive);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => handleSelectTable(t.id)}
                                className={cn(
                                  "rounded-lg border px-2 py-2 text-center text-xs font-semibold transition-all",
                                  selectedTable === t.id
                                    ? "border-brand-500 bg-brand-600 text-white shadow-xs"
                                    : isLive
                                      ? "border-emerald-400 bg-emerald-100 text-emerald-900 font-bold shadow-xs hover:bg-emerald-200"
                                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-300 hover:bg-brand-50",
                                )}
                              >
                                {t.label} {isLive ? "🟢" : ""}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
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
          {validationError ? (
            <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700">
              {validationError}
            </p>
          ) : result && !result.ok ? (
            <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
              {result.error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={cart.length === 0 || isPending || (!activeDay ? false : !isReadyToCharge)}
            onClick={() => {
              if (!activeDay) {
                window.dispatchEvent(new CustomEvent("minar:open-start-day"));
                return;
              }
              handleCharge();
            }}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold transition-all",
              !activeDay
                ? "bg-amber-600 text-white shadow-md hover:bg-amber-700 active:scale-[0.98]"
                : isReadyToCharge
                  ? "bg-brand-700 text-white shadow-md hover:bg-brand-800 active:scale-[0.98]"
                  : "cursor-not-allowed bg-slate-200 text-slate-400",
            )}
          >
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing…
              </span>
            ) : !activeDay ? (
              <span className="inline-flex items-center gap-1.5 font-bold">
                <Play className="size-4 fill-current" />
                Start Day to Sell
              </span>
            ) : !orderType && cart.length > 0 ? (
              <span>Select Table or Takeaway</span>
            ) : orderType === "table" && !selectedTable && cart.length > 0 ? (
              <span>Select Table Number</span>
            ) : (
              <>Charge {formatMoney(total)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

