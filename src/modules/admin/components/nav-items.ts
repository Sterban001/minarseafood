import {
  BookOpenText,
  ClipboardList,
  LayoutGrid,
  ScrollText,
  Table2,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { AppRole } from "@/shared/types/database";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  roles: AppRole[];
  /** Shown in the tablet bottom bar, not just the desktop sidebar. */
  primary?: boolean;
};

const all: AppRole[] = ["super_admin", "manager", "waiter"];
const managers: AppRole[] = ["super_admin", "manager"];
const superAdmin: AppRole[] = ["super_admin"];

export const navItems: NavItem[] = [
  {
    href: "/admin/tables",
    label: "Floor",
    shortLabel: "Floor",
    icon: LayoutGrid,
    roles: all,
    primary: true,
  },
  {
    href: "/admin/orders",
    label: "Live orders",
    shortLabel: "Orders",
    icon: ClipboardList,
    roles: all,
    primary: true,
  },
  {
    href: "/admin/reports",
    label: "Reports",
    shortLabel: "Reports",
    icon: TrendingUp,
    roles: managers,
    primary: true,
  },
  {
    href: "/admin/menu",
    label: "Menu",
    shortLabel: "Menu",
    icon: BookOpenText,
    roles: managers,
    primary: true,
  },
  {
    href: "/admin/floor-setup",
    label: "Table setup",
    shortLabel: "Tables",
    icon: Table2,
    roles: managers,
  },
  {
    href: "/admin/staff",
    label: "Staff",
    shortLabel: "Staff",
    icon: Users,
    roles: managers,
  },
  {
    href: "/admin/audit",
    label: "Audit trail",
    shortLabel: "Audit",
    icon: ScrollText,
    roles: superAdmin,
  },
];

export function navFor(role: AppRole): NavItem[] {
  return navItems.filter((item) => item.roles.includes(role));
}
