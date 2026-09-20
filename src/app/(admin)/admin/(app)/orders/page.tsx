import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/modules/admin/components/admin-shell";
import { Elapsed } from "@/modules/admin/components/elapsed";
import { RealtimeRefresh } from "@/modules/admin/components/realtime-refresh";
import { isManagerRole, requireStaff } from "@/modules/admin/auth/session";
import { getLiveOrders } from "@/modules/admin/pos/queries";
import { formatTime } from "@/shared/lib/dates";
import { formatMoney } from "@/shared/lib/money";
import { ButtonLink } from "@/shared/ui/button";
import { Badge, Card, EmptyState } from "@/shared/ui/surface";

export const metadata: Metadata = { title: "Live orders" };

export default async function LiveOrdersPage() {
  const { profile } = await requireStaff();
  const orders = await getLiveOrders();

  const total = orders.reduce((sum, order) => sum + order.total, 0);

  return (
    <>
      <PageHeader
        title="Live orders"
        subtitle={
          <span className="flex items-center gap-2">
            <RealtimeRefresh channel="live-orders" />
            {isManagerRole(profile.role)
              ? `Every open bill in the restaurant · ${formatMoney(total)} outstanding`
              : `Your open tables · ${formatMoney(total)} outstanding`}
          </span>
        }
        actions={<ButtonLink href="/admin/tables">Open a table</ButtonLink>}
      />

      {orders.length === 0 ? (
        <EmptyState
          title="Nothing open right now"
          description="Start an order from the floor screen and it appears here."
          action={<ButtonLink href="/admin/tables">Go to the floor</ButtonLink>}
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-200">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <span className="w-20 font-semibold text-slate-900">
                    {order.tableLabel}
                  </span>

                  <span className="text-sm text-slate-500">#{order.orderNo}</span>

                  {order.status === "billed" ? (
                    <Badge tone="spice">Billed</Badge>
                  ) : (
                    <Badge tone="brand">Open</Badge>
                  )}

                  <span className="text-sm text-slate-600">{order.waiterName}</span>

                  <span className="text-sm text-slate-500">
                    {order.guestCount} guests · {order.itemCount} items
                  </span>

                  <span className="ml-auto flex items-center gap-4">
                    <span className="text-xs text-slate-500">
                      {formatTime(order.openedAt)} · <Elapsed since={order.openedAt} />
                    </span>
                    <span className="w-24 text-right font-semibold text-slate-900 tabular-nums">
                      {formatMoney(order.total)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
