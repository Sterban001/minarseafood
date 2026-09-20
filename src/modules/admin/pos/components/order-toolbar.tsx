import {
  ArrowRightLeft,
  BadgePercent,
  CircleSlash,
  Merge,
  RotateCcw,
  UserCog,
} from "lucide-react";

import { ActionForm } from "@/modules/admin/components/action-form";
import { Popover } from "@/modules/admin/components/popover";
import { formatMoney } from "@/shared/lib/money";
import type { Order } from "@/shared/types/database";
import { Field, Input, Select } from "@/shared/ui/form";
import { SubmitButton } from "@/shared/ui/submit-button";

import {
  applyDiscount,
  assignWaiter,
  cancelOrder,
  mergeOrders,
  moveOrder,
  reopenOrder,
} from "../actions";

type Props = {
  order: Order;
  tables: { id: string; label: string; zone: string }[];
  waiters: { id: string; full_name: string }[];
  /** Other live orders that could be folded into this one. */
  mergeable: { id: string; order_no: number; label: string }[];
  isManager: boolean;
  isSuperAdmin: boolean;
};

/** Everything that changes the order rather than its items. */
export function OrderToolbar({
  order,
  tables,
  waiters,
  mergeable,
  isManager,
  isSuperAdmin,
}: Props) {
  const live = order.status === "open" || order.status === "billed";

  return (
    <div className="flex flex-wrap gap-2">
      {live ? (
        <Popover
          label={
            <>
              <ArrowRightLeft className="size-4" aria-hidden />
              Move
            </>
          }
          width="w-64"
        >
          <ActionForm action={moveOrder} className="space-y-3">
            <input type="hidden" name="orderId" value={order.id} />
            <Field
              label="Move this bill to"
              htmlFor="move-table"
              hint="Only free tables are listed."
            >
              <Select id="move-table" name="tableId" defaultValue="">
                <option value="">Takeaway / counter</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.label} · {table.zone}
                  </option>
                ))}
              </Select>
            </Field>
            <SubmitButton size="sm" className="w-full">
              Move bill
            </SubmitButton>
          </ActionForm>
        </Popover>
      ) : null}

      {isManager && live ? (
        <Popover
          label={
            <>
              <BadgePercent className="size-4" aria-hidden />
              Discount
            </>
          }
          width="w-72"
        >
          <ActionForm action={applyDiscount} className="space-y-3">
            <input type="hidden" name="orderId" value={order.id} />
            <p className="text-xs text-slate-500">
              Bill is {formatMoney(order.subtotal)} before discount.
            </p>
            <Field label="Discount amount (₹)" htmlFor="discount-amount">
              <Input
                id="discount-amount"
                name="amount"
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                defaultValue={order.discount || ""}
                placeholder="0"
              />
            </Field>
            <Field label="Reason" htmlFor="discount-reason">
              <Input
                id="discount-reason"
                name="reason"
                defaultValue={order.discount_reason ?? ""}
                placeholder="Regular guest, service delay…"
              />
            </Field>
            <SubmitButton size="sm" className="w-full">
              Apply discount
            </SubmitButton>
            <p className="text-xs text-slate-400">
              Set it to 0 to remove. Every discount is logged against your name.
            </p>
          </ActionForm>
        </Popover>
      ) : null}

      {isManager && live ? (
        <Popover
          label={
            <>
              <UserCog className="size-4" aria-hidden />
              Waiter
            </>
          }
          width="w-64"
        >
          <ActionForm action={assignWaiter} className="space-y-3">
            <input type="hidden" name="orderId" value={order.id} />
            <Field
              label="Credit this sale to"
              htmlFor="assign-waiter"
              hint="Changes who the sale counts for in reports."
            >
              <Select
                id="assign-waiter"
                name="waiterId"
                defaultValue={order.waiter_id ?? ""}
              >
                {waiters.map((waiter) => (
                  <option key={waiter.id} value={waiter.id}>
                    {waiter.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <SubmitButton size="sm" className="w-full">
              Hand over
            </SubmitButton>
          </ActionForm>
        </Popover>
      ) : null}

      {isManager && order.status === "open" && mergeable.length > 0 ? (
        <Popover
          label={
            <>
              <Merge className="size-4" aria-hidden />
              Merge
            </>
          }
          width="w-72"
        >
          <ActionForm action={mergeOrders} className="space-y-3">
            <input type="hidden" name="orderId" value={order.id} />
            <Field
              label="Fold another table into this bill"
              htmlFor="merge-source"
              hint="Its items move here and it is closed as merged."
            >
              <Select id="merge-source" name="sourceOrderId" defaultValue="">
                <option value="">Choose a table…</option>
                {mergeable.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    #{candidate.order_no} · {candidate.label}
                  </option>
                ))}
              </Select>
            </Field>
            <SubmitButton size="sm" className="w-full">
              Merge into this bill
            </SubmitButton>
          </ActionForm>
        </Popover>
      ) : null}

      {isManager && live ? (
        <Popover
          label={
            <>
              <CircleSlash className="size-4" aria-hidden />
              Cancel
            </>
          }
          variant="outline"
          width="w-72"
        >
          <ActionForm action={cancelOrder} className="space-y-3">
            <input type="hidden" name="orderId" value={order.id} />
            <p className="text-xs text-slate-600">
              Cancelling frees the table and records the order as a non-sale.
            </p>
            <Field label="Reason" htmlFor="cancel-reason" required>
              <Input
                id="cancel-reason"
                name="reason"
                placeholder="Walked out, duplicate ticket…"
                required
                minLength={3}
              />
            </Field>
            <SubmitButton size="sm" variant="danger" className="w-full">
              Cancel order
            </SubmitButton>
          </ActionForm>
        </Popover>
      ) : null}

      {isSuperAdmin && !live ? (
        <Popover
          label={
            <>
              <RotateCcw className="size-4" aria-hidden />
              Reopen
            </>
          }
          width="w-72"
        >
          <ActionForm action={reopenOrder} className="space-y-3">
            <input type="hidden" name="orderId" value={order.id} />
            <p className="text-xs text-slate-600">
              Reopening a {order.status} bill puts it back on the floor and clears the
              payment. It is written to the audit trail.
            </p>
            <SubmitButton size="sm" variant="danger" className="w-full">
              Reopen bill #{order.order_no}
            </SubmitButton>
          </ActionForm>
        </Popover>
      ) : null}
    </div>
  );
}
