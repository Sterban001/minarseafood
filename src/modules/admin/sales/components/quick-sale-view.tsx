"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

import { createSale, type CreateSaleResult, type SaleCartItem } from "@/modules/admin/sales/actions";
import type { CategoryWithItems, LiveTableInfo } from "@/modules/admin/sales/queries";
import { fullAddress, restaurant } from "@/shared/config/restaurant";
import { formatBusinessDate, todayBusinessDate } from "@/shared/lib/dates";
import { formatAmount, formatMoney } from "@/shared/lib/money";
import type { BusinessDay, DiningTable, MenuItem } from "@/shared/types/database";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";

type CartLine = SaleCartItem & { lineTotal: number };

type LastSaleReceipt = {
  items: CartLine[];
  saleNo: number;
  tableLabel: string | null;
  isTakeaway: boolean;
  total: number;
  businessDate: string;
  time: string;
};

type DishVariant = {
  item: MenuItem;
  variantLabel: string;
};

type DishCluster = {
  id: string;
  baseTitle: string;
  isGroup: boolean;
  items: DishVariant[];
};

const VARIANT_PATTERNS = [
  // Bottle / Volume sizes: e.g. "500ml", "500ML", "1L", "1 L", "1 Litre", "250ml", "750ml"
  {
    regex: /[-–—/(\[\s]+\b([0-9]+(?:\.[0-9]+)?\s*(?:ml|l|ltr|litres?))\b[)\]]?/i,
    format: (m: string) => {
      const match = m.trim().match(/([0-9]+(?:\.[0-9]+)?)\s*(ml|l|ltr|litres?)/i);
      if (match) {
        const val = match[1];
        const unit = match[2].toLowerCase();
        if (unit.startsWith("l")) return `${val}L`;
        return `${val}ML`;
      }
      return m.trim().toUpperCase();
    },
  },
  // Piece counts (digits): e.g. "1pc", "2pc", "4pc", "1 pc", "2 pcs", "1 piece", "2 piece", "4 piece"
  {
    regex: /[-–—/(\[\s]+\b([0-9]+\s*(?:pcs?|pieces?))\b[)\]]?/i,
    format: (m: string) => {
      const match = m.trim().match(/([0-9]+)\s*(?:pcs?|pieces?)/i);
      return match ? `${match[1]} Piece` : m.trim();
    },
  },
  // English words piece: e.g. "One Piece", "Two Piece", "Four Piece", "Single Piece"
  {
    regex: /[-–—/(\[\s]+\b((?:one|two|three|four|single|double)\s+piece(?:s)?)\b[)\]]?/i,
    format: (m: string) => {
      const words: Record<string, string> = {
        one: "1",
        two: "2",
        three: "3",
        four: "4",
        single: "1",
        double: "2",
      };
      const lower = m.trim().toLowerCase();
      const firstWord = lower.split(/\s+/)[0];
      if (words[firstWord]) {
        return `${words[firstWord]} Piece`;
      }
      return m.trim().replace(/\b\w/g, (c) => c.toUpperCase());
    },
  },
  // Single, Full, Half, Quarter
  {
    regex: /[-–—/(\[\s]+\b(single|full|half|quarter)\b[)\]]?/i,
    format: (m: string) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase(),
  },
  // Small, Big, Large, Medium
  {
    regex: /[-–—/(\[\s]+\b(small|big|large|medium|regular)\b[)\]]?/i,
    format: (m: string) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase(),
  },
  // Per KG, /KG, / KG
  {
    regex: /[-–—/(\[\s]+(\/?\s*(?:per\s+)?kg)\b[)\]]?/i,
    format: () => "/KG",
  },
];

function normalizeBaseKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/\bbrosted\b/g, "broasted")
    .replace(/\bprawn\b/g, "prawns")
    .replace(/\bpomfret\b/g, "pamplet")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalTitle(raw: string): string {
  let title = raw.trim();
  title = title.replace(/\bbrosted\b/gi, "Broasted");
  title = title.replace(/\bprawn\s+fry\b/gi, "Prawns Fry");
  title = title.replace(/\bprawn\b/gi, "Prawns");
  title = title.replace(/\bpamplet\b/gi, "Pamplet");
  title = title.replace(/\bpomfret\b/gi, "Pamplet");
  title = title.replace(/\bwater bottle\b/gi, "Water Bottle");
  title = title.replace(/\bchicken mandi\b/gi, "Chicken Mandi");
  title = title.replace(/\bchicken juicy mandi\b/gi, "Chicken Juicy Mandi");
  return title.replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

function parseVariant(rawName: string): { base: string; variant: string | null } {
  const noteMatch = rawName.match(/\s*(\([^)]+\))\s*$/);
  const note = noteMatch ? noteMatch[1] : "";
  const nameWithoutNote = noteMatch ? rawName.slice(0, -noteMatch[0].length).trim() : rawName.trim();

  for (const { regex, format } of VARIANT_PATTERNS) {
    const match = nameWithoutNote.match(regex);
    if (match) {
      const variantRaw = match[1];
      const base = nameWithoutNote.replace(match[0], "").trim().replace(/[-–—/(\[,]+$/, "").trim();
      if (base.length > 0) {
        const formatted = format(variantRaw);
        return {
          base,
          variant: note ? `${formatted} ${note}` : formatted,
        };
      }
    }
  }

  // If the note itself is a variant keyword like "(Single)", "(Full)", "(1pc)", or "(500ML)"
  if (note) {
    const inner = note.replace(/^\(|\)$/g, "").trim();
    const padded = ` ${inner}`;
    for (const { regex, format } of VARIANT_PATTERNS) {
      const match = padded.match(regex);
      if (match) {
        return { base: nameWithoutNote, variant: format(match[1]) };
      }
    }
  }

  return { base: rawName.trim(), variant: null };
}

function clusterMenuItems(items: MenuItem[]): DishCluster[] {
  if (!items.length) return [];

  const parsed = items.map((item) => {
    const { base, variant } = parseVariant(item.name);
    return { item, base, variant };
  });

  // Group by normalized base (resolves typos and singular/plural: brosted -> broasted, prawn -> prawns)
  const groups = new Map<string, { baseTitle: string; items: typeof parsed }>();
  for (const p of parsed) {
    const key = normalizeBaseKey(p.base);
    if (!groups.has(key)) {
      groups.set(key, { baseTitle: canonicalTitle(p.base), items: [] });
    }
    const existing = groups.get(key)!;
    if (/broasted/i.test(p.base) && !/broasted/i.test(existing.baseTitle)) {
      existing.baseTitle = canonicalTitle(p.base);
    }
    if (/prawns/i.test(p.base) && !/prawns/i.test(existing.baseTitle)) {
      existing.baseTitle = canonicalTitle(p.base);
    }
    existing.items.push(p);
  }

  // Handle case where one dish is named "Chicken 65" (no variant keyword)
  // and another is named "Chicken 65 Full" or "Chicken 65 Single".
  for (const [key, group] of Array.from(groups.entries())) {
    if (group.items.length === 1 && !group.items[0].variant) {
      for (const [otherKey, otherGroup] of groups.entries()) {
        if (
          otherKey !== key &&
          (otherKey.startsWith(key) || key.startsWith(otherKey)) &&
          otherGroup.items.some((i) => Boolean(i.variant))
        ) {
          otherGroup.items.push(group.items[0]);
          groups.delete(key);
          break;
        }
      }
    }
  }

  const clusters: DishCluster[] = [];
  for (const group of groups.values()) {
    if (group.items.length > 1) {
      // Sort variants by price ascending (e.g. Single -> Full, 1 Piece -> 2 Piece -> 4 Piece, 500ML -> 1L)
      const sorted = [...group.items].sort((a, b) => a.item.price - b.item.price);
      clusters.push({
        id: `group-${group.baseTitle.toLowerCase().replace(/\s+/g, "-")}`,
        baseTitle: group.baseTitle,
        isGroup: true,
        items: sorted.map((s, idx) => {
          let label = s.variant;
          if (!label) {
            if (sorted.length === 2) {
              const hasFull = sorted.some((x) => x.variant?.toLowerCase().includes("full"));
              const hasBig = sorted.some((x) => x.variant?.toLowerCase().includes("big"));
              if (hasBig) {
                label = idx === 0 ? "Small" : "Big";
              } else if (hasFull) {
                label = idx === 0 ? "Single" : "Full";
              } else {
                label = idx === 0 ? "Single" : "Full";
              }
            } else {
              label = s.item.name;
            }
          }
          return {
            item: s.item,
            variantLabel: label,
          };
        }),
      });
    } else {
      const single = group.items[0];
      clusters.push({
        id: single.item.id,
        baseTitle: single.item.name,
        isGroup: false,
        items: [
          {
            item: single.item,
            variantLabel: single.item.name,
          },
        ],
      });
    }
  }

  return clusters;
}

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
  const [lastSaleReceipt, setLastSaleReceipt] = useState<LastSaleReceipt | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dineInTables = useMemo(
    () => tables.filter((t) => t.zone !== "Takeaway"),
    [tables],
  );
  const takeawaySlots = useMemo(
    () => tables.filter((t) => t.zone === "Takeaway"),
    [tables],
  );

  const activeCat = categories.find((c) => c.id === activeCategory);
  const itemClusters = useMemo(() => {
    return clusterMenuItems(activeCat?.items ?? []);
  }, [activeCat?.items]);

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
    setTablePickerOpen(false);
    setValidationError(null);

    // If selectedTable is not already a takeaway slot, default to first available takeaway slot
    const isCurrentTakeaway = takeawaySlots.some((t) => t.id === selectedTable);
    if (!isCurrentTakeaway && takeawaySlots.length > 0) {
      const firstAvailable =
        takeawaySlots.find((t) => !liveTables[t.id]?.isLive) ?? takeawaySlots[0];
      setSelectedTable(firstAvailable?.id ?? null);
    }
  };

  const handleSelectTakeawaySlot = (slotId: string) => {
    setOrderType("takeaway");
    setSelectedTable(slotId);
    setTablePickerOpen(false);
    setValidationError(null);
  };

  const handleSelectTableMode = () => {
    setOrderType("table");
    const isCurrentTakeaway = takeawaySlots.some((t) => t.id === selectedTable);
    if (isCurrentTakeaway) {
      setSelectedTable(null);
    }
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
      const currentCart = [...cart];
      const currentSelectedTable = selectedTable;
      const currentOrderType = orderType;
      const tableObj = tables.find((t) => t.id === currentSelectedTable);
      const tableLabel = tableObj?.label ?? (currentOrderType === "takeaway" ? "Takeaway" : null);
      const isTakeaway = currentOrderType === "takeaway" || Boolean(tableObj?.zone === "Takeaway");
      const currentTotal = total;

      const res = await createSale(currentCart, currentSelectedTable);
      setResult(res);
      if (res.ok) {
        setLastSaleReceipt({
          items: currentCart,
          saleNo: res.saleNo,
          tableLabel,
          isTakeaway,
          total: currentTotal,
          businessDate: activeDay?.date ?? todayBusinessDate(),
          time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
        });
        setCart([]);
        setOrderType(null);
        setSelectedTable(null);
      }
    });
  };

  useEffect(() => {
    if (result?.ok && lastSaleReceipt) {
      const timer = setTimeout(() => {
        window.print();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [result?.ok, lastSaleReceipt]);

  const handleNewSale = () => {
    setResult(null);
    setLastSaleReceipt(null);
    setCart([]);
    setOrderType(null);
    setSelectedTable(null);
    setValidationError(null);
  };

  // Group dine-in tables by zone for the picker
  const tablesByZone = dineInTables.reduce<Record<string, DiningTable[]>>((acc, t) => {
    (acc[t.zone] ??= []).push(t);
    return acc;
  }, {});

  // Success state with instant direct printing
  if (result?.ok) {
    return (
      <>
        {/* Printable thermal receipt rendered directly in DOM — fires instantly via window.print() */}
        {lastSaleReceipt && (
          <div className="hidden print:block print-sheet mx-auto max-w-sm">
            <header className="text-center">
              <h1 className="font-display text-xl font-semibold tracking-wide text-slate-900">
                {restaurant.displayName}
              </h1>
              <p className="mt-1 text-[0.7rem] leading-snug text-slate-500">{fullAddress}</p>
              <p className="text-[0.7rem] text-slate-500">{restaurant.phone}</p>
              <div
                className={cn(
                  "mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide",
                  lastSaleReceipt.isTakeaway
                    ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                    : "bg-brand-50 text-brand-800",
                )}
              >
                {lastSaleReceipt.isTakeaway
                  ? lastSaleReceipt.tableLabel
                    ? `🛍️ ${lastSaleReceipt.tableLabel}`
                    : "🛍️ Takeaway"
                  : `Table ${lastSaleReceipt.tableLabel}`}
              </div>
              <div className="mt-1 text-sm font-bold text-slate-700">
                Sale #{lastSaleReceipt.saleNo}
              </div>
            </header>

            <div className="mt-3 border-y border-dashed border-slate-300 py-2 text-[0.72rem] text-slate-700 space-y-0.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-slate-500">Order Type</span>
                <span className="font-medium">
                  {lastSaleReceipt.isTakeaway ? "🛍️ Takeaway" : "🍽️ Dine-In Table"}
                </span>
              </div>
              {lastSaleReceipt.tableLabel ? (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-slate-500">
                    {lastSaleReceipt.isTakeaway ? "Takeaway Slot" : "Table"}
                  </span>
                  <span className="font-medium">{lastSaleReceipt.tableLabel}</span>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-slate-500">Sales Date</span>
                <span className="font-medium">
                  {formatBusinessDate(lastSaleReceipt.businessDate)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-slate-500">Time</span>
                <span className="font-medium">{lastSaleReceipt.time}</span>
              </div>
            </div>

            <table className="mt-3 w-full text-[0.75rem]">
              <thead>
                <tr className="border-b border-slate-300 text-left text-slate-500">
                  <th className="pb-1 font-medium">Item</th>
                  <th className="pb-1 text-center font-medium">Qty</th>
                  <th className="pb-1 text-right font-medium">Rate</th>
                  <th className="pb-1 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lastSaleReceipt.items.map((item, idx) => (
                  <tr key={`${item.menuItemId}-${idx}`} className="align-top">
                    <td className="py-1.5 pr-2 font-medium text-slate-800">{item.name}</td>
                    <td className="py-1.5 text-center tabular-nums">{item.qty}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatAmount(item.price)}</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">
                      {formatAmount(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 space-y-1 border-t border-dashed border-slate-300 pt-2 text-[0.78rem]">
              <div className="mt-1 flex items-baseline justify-between border-t border-slate-300 pt-1.5 text-base font-bold text-slate-900">
                <span>Grand Total</span>
                <span className="tabular-nums">{formatMoney(lastSaleReceipt.total)}</span>
              </div>
            </div>

            <p className="mt-4 border-t border-dashed border-slate-300 pt-3 text-center text-[0.72rem] font-bold text-slate-700 uppercase tracking-wider">
              Paid — Thank You
            </p>
            <p className="mt-1 text-center text-[0.7rem] text-slate-500">
              Please visit us again!
            </p>
          </div>
        )}

        {/* Screen Confirmation View (hidden from printer) */}
        <div className="print-hidden flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
          <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100">
            <Check className="size-10 text-emerald-600" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">
              Sale #{result.saleNo}
            </h2>
            <p className="mt-1 text-sm font-medium text-emerald-600">
              ✓ Payment received • Printing instantly
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() => window.print()}
            >
              <Printer className="size-4" aria-hidden />
              Reprint Ticket
            </Button>
            <Button variant="outline" onClick={handleNewSale}>
              Next Sale
            </Button>
          </div>
        </div>
      </>
    );
  }

  const isReadyToCharge =
    Boolean(activeDay) &&
    cart.length > 0 &&
    orderType !== null &&
    (orderType === "takeaway" ? Boolean(selectedTable || takeawaySlots.length === 0) : Boolean(selectedTable));

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
            {itemClusters.map((cluster) => {
              if (cluster.isGroup) {
                const groupInCartCount = cluster.items.reduce((sum, v) => {
                  const line = cart.find((l) => l.menuItemId === v.item.id);
                  return sum + (line?.qty ?? 0);
                }, 0);

                return (
                  <div
                    key={cluster.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all"
                  >
                    {/* Dish title header */}
                    <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1.5 mb-2 px-0.5">
                      <span
                        className="text-xs font-bold uppercase tracking-wider text-slate-800 truncate"
                        title={cluster.baseTitle}
                      >
                        {cluster.baseTitle}
                      </span>
                      {groupInCartCount > 0 && (
                        <span className="flex items-center gap-0.5 rounded-full bg-brand-100 px-1.5 py-0.5 text-[0.65rem] font-bold text-brand-800 ring-1 ring-brand-300/60 shrink-0">
                          <span>{groupInCartCount}</span>
                          <span className="text-[0.6rem] font-medium">in cart</span>
                        </span>
                      )}
                    </div>

                    {/* Stacked variants: one above the other */}
                    <div className="flex flex-col gap-1.5 flex-1 justify-center">
                      {cluster.items.map((variant) => {
                        const inCart = cart.find((l) => l.menuItemId === variant.item.id);
                        return (
                          <button
                            key={variant.item.id}
                            type="button"
                            onClick={() => addItem(variant.item.id, variant.item.name, variant.item.price)}
                            className={cn(
                              "relative flex items-center justify-between rounded-lg px-2.5 py-2 text-left transition-all active:scale-[0.98] cursor-pointer",
                              inCart
                                ? "bg-brand-700 text-white font-medium shadow-xs ring-1 ring-brand-800"
                                : "bg-slate-50 hover:bg-brand-50 hover:text-brand-900 border border-slate-200 text-slate-800",
                            )}
                          >
                            <span className="text-xs font-semibold truncate pr-1.5">
                              {variant.variantLabel}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={cn(
                                  "text-xs font-bold tabular-nums",
                                  inCart ? "text-white" : "text-brand-700",
                                )}
                              >
                                {formatMoney(variant.item.price)}
                              </span>
                              {inCart && (
                                <span className="flex size-4.5 items-center justify-center rounded-full bg-white text-[0.65rem] font-black text-brand-700 shadow-2xs">
                                  {inCart.qty}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Standalone item card
              const item = cluster.items[0].item;
              const inCart = cart.find((l) => l.menuItemId === item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item.id, item.name, item.price)}
                  className={cn(
                    "relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all active:scale-[0.97] min-h-[96px] cursor-pointer",
                    inCart
                      ? "border-brand-300 bg-brand-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs",
                  )}
                >
                  <span className="text-sm font-semibold text-slate-900 leading-snug">
                    {item.name}
                  </span>
                  <span className="mt-2 text-sm font-bold text-brand-700 tabular-nums">
                    {formatMoney(item.price)}
                  </span>
                  {inCart ? (
                    <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white shadow-xs">
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
                {orderType === "takeaway"
                  ? selectedTableObj
                    ? `🛍️ ${selectedTableObj.label}`
                    : "🛍️ Takeaway"
                  : selectedTableObj
                    ? `🍽️ Table ${selectedTableObj.label}`
                    : "Select Table"}
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
                  ? "border-amber-400 bg-amber-50 text-amber-900 shadow-xs ring-1 ring-amber-400/40"
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
                  ? "border-brand-400 bg-brand-50 text-brand-900 shadow-xs ring-1 ring-brand-400/40"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
              )}
            >
              🍽️ Table {selectedTableObj && orderType === "table" ? `(${selectedTableObj.label})` : ""}
            </button>
          </div>

          {/* Takeaway Slots Selector */}
          {orderType === "takeaway" && takeawaySlots.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[0.7rem] text-slate-500">
                <span className="font-semibold text-slate-700">Takeaway Order Slot:</span>
                <span className="text-[0.65rem] text-slate-400">🟢 = Live Unbilled</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {takeawaySlots.map((slot) => {
                  const live = liveTables[slot.id];
                  const isLive = Boolean(live?.isLive);
                  const isSelected = selectedTable === slot.id;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => handleSelectTakeawaySlot(slot.id)}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg border py-1.5 px-1 text-center transition-all",
                        isSelected
                          ? "border-amber-500 bg-amber-500 text-white font-bold shadow-xs"
                          : isLive
                            ? "border-emerald-400 bg-emerald-100 text-emerald-950 font-bold shadow-xs hover:bg-emerald-200"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-300 hover:bg-amber-50/50",
                      )}
                    >
                      <span className="text-[0.7rem] leading-tight">
                        {slot.label.replace(/^Takeaway\s*/i, "TK ")}
                      </span>
                      {isLive ? (
                        <span
                          className={cn(
                            "text-[0.6rem] font-black",
                            isSelected ? "text-amber-100" : "text-emerald-700",
                          )}
                        >
                          ₹{live.unbilledTotal}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {selectedTableObj ? (
                <div className="flex items-center justify-between rounded-lg bg-amber-50/90 border border-amber-200 px-2.5 py-1.5 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ShoppingBag className="size-3.5 text-amber-700 shrink-0" />
                    <span className="font-bold text-amber-950 truncate">
                      🛍️ {selectedTableObj.label}
                    </span>
                    {liveTables[selectedTableObj.id]?.isLive ? (
                      <span className="rounded-full bg-emerald-600 px-1.5 py-0.2 text-[0.65rem] font-bold text-white shadow-2xs">
                        🟢 LIVE ({formatMoney(liveTables[selectedTableObj.id].unbilledTotal)})
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={`/admin/table-receipt/${selectedTableObj.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 font-semibold text-amber-800 hover:text-amber-950 hover:underline shrink-0"
                  >
                    <Printer className="size-3.5" />
                    Print Full Bill
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Dine-In Table Selected Info */}
          {orderType === "table" && selectedTable && selectedTableObj ? (
            <div className="flex items-center justify-between rounded-lg bg-brand-50/70 border border-brand-200 px-2.5 py-1.5 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-brand-800 truncate">Table {selectedTableObj.label}</span>
                {liveTables[selectedTable]?.isLive ? (
                  <span className="rounded-full bg-emerald-600 px-1.5 py-0.2 text-[0.65rem] font-bold text-white shadow-2xs">
                    🟢 LIVE ({formatMoney(liveTables[selectedTable].unbilledTotal)})
                  </span>
                ) : null}
              </div>
              <Link
                href={`/admin/table-receipt/${selectedTable}`}
                target="_blank"
                className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-900 hover:underline shrink-0"
              >
                <Printer className="size-3.5" />
                Print Full Table Bill
              </Link>
            </div>
          ) : null}

          {/* Table Picker Dropdown / Grid for Dine-In */}
          {orderType === "table" || tablePickerOpen ? (
            <div className="relative pt-1">
              <button
                type="button"
                onClick={() => setTablePickerOpen(!tablePickerOpen)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all",
                  selectedTable && orderType === "table"
                    ? "border-brand-300 bg-brand-50 font-semibold text-brand-800"
                    : "border-amber-300 bg-amber-50/50 text-amber-800 font-medium",
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="size-3.5 shrink-0" />
                  <span>
                    {selectedTableObj && orderType === "table"
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
                  {dineInTables.length === 0 ? (
                    <p className="p-2 text-center text-xs text-slate-500">
                      No active dine-in tables configured. Go to Admin &gt; Tables to add tables.
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

