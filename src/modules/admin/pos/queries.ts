import { createServerSupabase } from "@/shared/supabase/server";
import { toNumber } from "@/shared/lib/money";
import type {
  MenuCategory,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  Profile,
} from "@/shared/types/database";

export type FloorSlot = {
  tableId: string | null;
  tableLabel: string;
  zone: string;
  seats: number;
  orderId: string | null;
  orderNo: number | null;
  status: OrderStatus | null;
  waiterId: string | null;
  waiterName: string | null;
  guestCount: number;
  total: number;
  itemCount: number;
  openedAt: string | null;
  isMine: boolean;
};

/** Occupancy for every active table plus any takeaway orders in progress. */
export async function getFloor(): Promise<FloorSlot[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("floor_snapshot");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    tableId: row.table_id,
    tableLabel: row.table_label,
    zone: row.zone,
    seats: row.seats,
    orderId: row.order_id,
    orderNo: row.order_no,
    status: row.status,
    waiterId: row.waiter_id,
    waiterName: row.waiter_name,
    guestCount: row.guest_count ?? 0,
    total: toNumber(row.total),
    itemCount: row.item_count,
    openedAt: row.opened_at,
    isMine: row.is_mine,
  }));
}

export type PosMenu = {
  categories: Pick<MenuCategory, "id" | "name">[];
  items: Pick<
    MenuItem,
    "id" | "category_id" | "name" | "price" | "is_available" | "sort_order"
  >[];
};

/** The whole menu in one go — the order screen filters client-side so taps are instant. */
export async function getPosMenu(): Promise<PosMenu> {
  const supabase = await createServerSupabase();

  const [categories, items] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("menu_items")
      .select("id, category_id, name, price, is_available, sort_order")
      .order("sort_order")
      .order("name"),
  ]);

  if (categories.error) throw new Error(categories.error.message);
  if (items.error) throw new Error(items.error.message);

  return { categories: categories.data ?? [], items: items.data ?? [] };
}

export type OrderDetail = {
  order: Order;
  items: OrderItem[];
  tableLabel: string | null;
  waiterName: string | null;
  addedByNames: Record<string, string>;
};

/** Full bill for the order screen and the printable receipt. */
export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const supabase = await createServerSupabase();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!order) return null;

  const [itemsResult, tableResult, staffResult] = await Promise.all([
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    order.table_id
      ? supabase
          .from("dining_tables")
          .select("label")
          .eq("id", order.table_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("profiles").select("id, full_name"),
  ]);

  if (itemsResult.error) throw new Error(itemsResult.error.message);

  const names = Object.fromEntries(
    (staffResult.data ?? []).map((row) => [row.id, row.full_name]),
  );

  return {
    order,
    items: itemsResult.data ?? [],
    tableLabel: tableResult.data?.label ?? null,
    waiterName: order.waiter_id ? (names[order.waiter_id] ?? null) : null,
    addedByNames: names,
  };
}

export type LiveOrderRow = {
  id: string;
  orderNo: number;
  status: OrderStatus;
  tableLabel: string;
  waiterName: string;
  guestCount: number;
  itemCount: number;
  total: number;
  openedAt: string;
};

/**
 * Live orders the signed-in user is allowed to open. Row level security means a
 * waiter gets their own tables and a manager gets the whole floor.
 */
export async function getLiveOrders(): Promise<LiveOrderRow[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, order_no, status, guest_count, total, opened_at,
       dining_tables ( label ),
       waiter:profiles!orders_waiter_id_fkey ( full_name ),
       order_items ( qty, voided_at )`,
    )
    .in("status", ["open", "billed"])
    .order("opened_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    orderNo: row.order_no,
    status: row.status,
    tableLabel: row.dining_tables?.label ?? "Takeaway",
    waiterName: row.waiter?.full_name ?? "Unassigned",
    guestCount: row.guest_count,
    itemCount: (row.order_items ?? [])
      .filter((item) => item.voided_at === null)
      .reduce((sum, item) => sum + item.qty, 0),
    total: toNumber(row.total),
    openedAt: row.opened_at,
  }));
}

/** Active waiters, for the "whose table is this?" picker managers get. */
export async function getActiveWaiters(): Promise<Pick<Profile, "id" | "full_name" | "role">[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("is_active", true)
    .order("full_name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Active tables, for opening an order and for the move/merge pickers. */
export async function getActiveTables() {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("dining_tables")
    .select("id, label, seats, zone")
    .eq("is_active", true)
    .order("sort_order")
    .order("label");

  if (error) throw new Error(error.message);
  return data ?? [];
}
