import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { RealtimeRefresh } from "@/modules/admin/components/realtime-refresh";
import { isManagerRole, requireStaff } from "@/modules/admin/auth/session";
import { MenuPicker } from "@/modules/admin/pos/components/menu-picker";
import { OrderSummary } from "@/modules/admin/pos/components/order-summary";
import { OrderTicket } from "@/modules/admin/pos/components/order-ticket";
import { OrderToolbar } from "@/modules/admin/pos/components/order-toolbar";
import {
  getActiveTables,
  getActiveWaiters,
  getFloor,
  getOrderDetail,
  getPosMenu,
} from "@/modules/admin/pos/queries";
import { formatDateTime } from "@/shared/lib/dates";
import { Card, CardHeader } from "@/shared/ui/surface";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params }: PageProps<"/admin/orders/[orderId]">) {
  const { orderId } = await params;
  const { profile, userId } = await requireStaff();

  const detail = await getOrderDetail(orderId);
  // Row level security also hides other waiters' orders, so "missing" and
  // "not yours" both land here on purpose.
  if (!detail) notFound();

  const { order, items, tableLabel, waiterName, addedByNames } = detail;
  const isManager = isManagerRole(profile.role);
  const isSuperAdmin = profile.role === "super_admin";
  const editable = order.status === "open";

  const [menu, tables, waiters, floor] = await Promise.all([
    getPosMenu(),
    getActiveTables(),
    getActiveWaiters(),
    isManager ? getFloor() : Promise.resolve([]),
  ]);

  const occupiedTableIds = new Set(
    floor.filter((slot) => slot.orderId && slot.tableId).map((slot) => slot.tableId),
  );

  const freeTables = tables.filter(
    (table) => table.id === order.table_id || !occupiedTableIds.has(table.id),
  );

  const mergeable = floor
    .filter(
      (slot) => slot.orderId && slot.orderId !== order.id && slot.status === "open",
    )
    .map((slot) => ({
      id: slot.orderId as string,
      order_no: slot.orderNo as number,
      label: slot.tableLabel,
    }));

  const liveItems = items.filter((item) => item.voided_at === null);

  return (
    <>
      <div className="print-hidden mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/tables"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Floor
          </Link>
          <h1 className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xl font-semibold text-slate-900">
            {tableLabel ?? "Takeaway"}
            <span className="text-sm font-normal text-slate-500">
              Bill #{order.order_no} · {waiterName ?? "Unassigned"} ·{" "}
              {formatDateTime(order.opened_at)}
            </span>
            <RealtimeRefresh channel={`order-${order.id}`} />
          </h1>
        </div>

        <OrderToolbar
          order={order}
          tables={freeTables}
          waiters={waiters}
          mergeable={mergeable}
          isManager={isManager}
          isSuperAdmin={isSuperAdmin}
        />
      </div>

      {/* Bill on the left, menu pad on the right. On a phone the ticket comes
          first, then the pad, then the totals. */}
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:items-start">
        <Card className="order-1 xl:col-start-1 xl:row-start-1">
          <CardHeader
            title="Ticket"
            subtitle={
              liveItems.length > 0
                ? `${liveItems.reduce((sum, item) => sum + item.qty, 0)} items on the table`
                : "Nothing punched yet"
            }
          />
          <div className="px-4 py-1">
            <OrderTicket
              orderId={order.id}
              items={items}
              addedByNames={addedByNames}
              editable={editable}
              canVoid={isManager}
            />
          </div>
        </Card>

        {editable ? (
          <Card className="order-2 xl:col-start-2 xl:row-span-2 xl:row-start-1">
            <CardHeader
              title="Menu"
              subtitle={
                order.waiter_id === userId
                  ? "Your table · tap to add"
                  : `Punching for ${waiterName ?? "this table"} · tap to add`
              }
            />
            <div className="p-4">
              <MenuPicker orderId={order.id} menu={menu} />
            </div>
          </Card>
        ) : null}

        <Card className="order-3 p-4 xl:col-start-1 xl:row-start-2">
          <OrderSummary order={order} />
        </Card>
      </div>
    </>
  );
}
