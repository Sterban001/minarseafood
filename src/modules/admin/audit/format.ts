import { formatMoney } from "@/shared/lib/money";
import type { AuditEntry, Json } from "@/shared/types/database";

/**
 * Every action the audit triggers in `20260918120000_schema.sql` can write. If
 * you add a `audit_write()` call in SQL, add its action here or the log will
 * show the raw `order.something` string.
 */
export const auditActionGroups: {
  label: string;
  actions: { value: string; label: string }[];
}[] = [
  {
    label: "Bills",
    actions: [
      { value: "order.opened", label: "Table opened" },
      { value: "order.billed", label: "Bill printed" },
      { value: "order.paid", label: "Bill settled" },
      { value: "order.cancelled", label: "Bill cancelled" },
      { value: "order.open", label: "Bill reopened" },
      { value: "order.discount", label: "Discount changed" },
      { value: "order.moved", label: "Moved table" },
      { value: "order.reassigned", label: "Waiter changed" },
    ],
  },
  {
    label: "Items",
    actions: [
      { value: "item.added", label: "Item punched" },
      { value: "item.qty", label: "Quantity changed" },
      { value: "item.voided", label: "Item voided" },
      { value: "item.removed", label: "Item removed" },
    ],
  },
  {
    label: "Menu",
    actions: [
      { value: "menu.created", label: "Dish added" },
      { value: "menu.price", label: "Price changed" },
      { value: "menu.availability", label: "Availability changed" },
      { value: "menu.deleted", label: "Dish deleted" },
    ],
  },
  {
    label: "Staff",
    actions: [
      { value: "staff.created", label: "Login created" },
      { value: "staff.role", label: "Role changed" },
      { value: "staff.deactivated", label: "Login switched off" },
      { value: "staff.reactivated", label: "Login switched on" },
    ],
  },
];

const actionLabels = new Map(
  auditActionGroups.flatMap((group) =>
    group.actions.map((action) => [action.value, action.label] as const),
  ),
);

export const actionLabel = (action: string) => actionLabels.get(action) ?? action;

const dangerous = new Set([
  "order.cancelled",
  "item.voided",
  "item.removed",
  "menu.deleted",
  "staff.deactivated",
  "order.open",
]);

const money = new Set(["order.paid", "order.discount", "menu.price"]);

export type AuditTone = "neutral" | "brand" | "success" | "warning" | "danger" | "spice";

export function actionTone(action: string): AuditTone {
  if (dangerous.has(action)) return "danger";
  if (money.has(action)) return "spice";
  if (action === "staff.role" || action === "menu.availability") return "warning";
  if (action === "order.opened" || action === "item.added") return "brand";
  return "neutral";
}

export const auditEntities: { value: string; label: string }[] = [
  { value: "orders", label: "Bills" },
  { value: "order_items", label: "Items on bills" },
  { value: "menu_items", label: "Menu" },
  { value: "profiles", label: "Staff" },
];

const entityLabels = new Map(auditEntities.map((item) => [item.value, item.label]));

export const entityLabel = (entity: string) => entityLabels.get(entity) ?? entity;

type Bag = { [key: string]: Json | undefined };

const asBag = (value: Json | null): Bag =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};

/** Foreign keys are noise in a log; the link to the bill carries that already. */
const skipKeys = new Set(["order_id", "table_id", "waiter_id"]);
const moneyKeys = new Set(["price", "unit_price", "total", "discount"]);

const prettyKey = (key: string) => key.replaceAll("_", " ");

function formatValue(key: string, value: Json | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (moneyKeys.has(key) && (typeof value === "number" || typeof value === "string")) {
    return formatMoney(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export type ChangeField = { label: string; from?: string; to?: string };

/**
 * Turns the trigger's `before`/`after` snapshots into a short list of what moved.
 * Keys that did not change are dropped, so "discount ₹0 → ₹50" is all that is
 * left of an update that also rewrote the total.
 */
export function changeFields(entry: AuditEntry): ChangeField[] {
  const before = asBag(entry.before);
  const after = asBag(entry.after);
  const keys = [...new Set([...Object.keys(after), ...Object.keys(before)])];

  const fields: ChangeField[] = [];

  for (const key of keys) {
    if (skipKeys.has(key)) continue;

    const from = formatValue(key, before[key]);
    const to = formatValue(key, after[key]);

    if (from === undefined && to === undefined) continue;
    if (from === to) continue;

    fields.push({ label: prettyKey(key), from, to });
  }

  return fields;
}

/** The bill an entry belongs to, so item rows can link somewhere useful. */
export function relatedOrderId(entry: AuditEntry): string | null {
  if (entry.entity === "orders") return entry.entity_id;

  const fromBag = (value: Json | null) => {
    const orderId = asBag(value).order_id;
    return typeof orderId === "string" ? orderId : null;
  };

  return fromBag(entry.after) ?? fromBag(entry.before);
}
