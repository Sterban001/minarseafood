import {
  BookOpenText,
  ClipboardList,
  MapPin,
  ReceiptIndianRupee,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  /** Shown in the tablet bottom bar, not just the desktop sidebar. */
  primary?: boolean;
};

export const navItems: NavItem[] = [
  {
    href: "/admin",
    label: "Sale",
    shortLabel: "Sale",
    icon: ShoppingCart,
    primary: true,
  },
  {
    href: "/admin/history",
    label: "History",
    shortLabel: "History",
    icon: ClipboardList,
    primary: true,
  },
  {
    href: "/admin/expenses",
    label: "Expenses",
    shortLabel: "Expenses",
    icon: ReceiptIndianRupee,
    primary: true,
  },
  {
    href: "/admin/reports",
    label: "Reports",
    shortLabel: "Reports",
    icon: TrendingUp,
    primary: true,
  },
  {
    href: "/admin/menu",
    label: "Menu",
    shortLabel: "Menu",
    icon: BookOpenText,
    primary: true,
  },
  {
    href: "/admin/tables",
    label: "Tables",
    shortLabel: "Tables",
    icon: MapPin,
    primary: true,
  },
];

