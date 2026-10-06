import type { Expense } from "@/shared/types/database";

export type DailyExpensesData = {
  date: string;
  salaries: Expense[];
  items: Expense[];
  others: Expense[];
  totals: {
    salariesTotal: number;
    itemsTotal: number;
    othersTotal: number;
    grandTotal: number;
    salariesCount: number;
    itemsCount: number;
    othersCount: number;
  };
  salesTotal: number;
  netProfit: number;
};

export const STAFF_ROLE_PRESETS = [
  "Head Chef",
  "Tandoor Master",
  "Waiter",
  "Kitchen Helper",
  "Cleaner",
  "Cashier",
  "Manager",
] as const;

export const ITEM_UNIT_OPTIONS = [
  { value: "kg", label: "Kilograms (kg)" },
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "ltr", label: "Litres (ltr)" },
  { value: "pkt", label: "Packets (pkt)" },
  { value: "can", label: "Cans / Tins (can)" },
  { value: "box", label: "Boxes (box)" },
  { value: "bundle", label: "Bundles (bundle)" },
] as const;

export const ITEM_CATEGORIES = [
  "Raw Seafood",
  "Groceries & Spices",
  "Oil & Fuel",
  "Vegetables",
  "Packaging & Parcel",
  "Dairy & Eggs",
  "Other Supplies",
] as const;

export const QUICK_ITEM_SUGGESTIONS = [
  { name: "Raw Fish (Vanjaram)", unit: "kg", category: "Raw Seafood" },
  { name: "Raw Prawns", unit: "kg", category: "Raw Seafood" },
  { name: "Cooking Oil (15L)", unit: "can", category: "Oil & Fuel" },
  { name: "Commercial Gas Cylinder", unit: "can", category: "Oil & Fuel" },
  { name: "Onions & Tomatoes", unit: "kg", category: "Vegetables" },
  { name: "Mandi / Basmati Rice", unit: "kg", category: "Groceries & Spices" },
  { name: "Special Spices / Masalas", unit: "kg", category: "Groceries & Spices" },
  { name: "Parcel Boxes & Containers", unit: "pkt", category: "Packaging & Parcel" },
  { name: "Coal / Charcoal Bag", unit: "bundle", category: "Oil & Fuel" },
  { name: "Ice Blocks (Preservation)", unit: "pcs", category: "Raw Seafood" },
] as const;

export const MISC_CATEGORIES = [
  "Transport / Auto",
  "Utilities & Electricity",
  "Shop Maintenance / Repairs",
  "Cleaning & Hygiene",
  "Refreshments & Tea",
  "Municipal / Local",
  "Petty Cash",
  "Miscellaneous",
] as const;

export const QUICK_MISC_SUGGESTIONS = [
  { title: "Auto / Goods Rickshaw Fare", category: "Transport / Auto" },
  { title: "Electricity & Fuel Top-up", category: "Utilities & Electricity" },
  { title: "Drinking Water Bottles / Cans", category: "Utilities & Electricity" },
  { title: "Plumbing / Hardware Repair", category: "Shop Maintenance / Repairs" },
  { title: "Cleaning Phenyl, Soap & Brooms", category: "Cleaning & Hygiene" },
  { title: "Staff Tea & Evening Refreshments", category: "Refreshments & Tea" },
  { title: "Emergency Petty Cash", category: "Petty Cash" },
] as const;
