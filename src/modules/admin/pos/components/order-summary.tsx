import Link from "next/link";
import { Banknote, CreditCard, Printer, Smartphone } from "lucide-react";

import { ActionForm } from "@/modules/admin/components/action-form";
import { formatMoney } from "@/shared/lib/money";
import type { Order } from "@/shared/types/database";
import { buttonClass } from "@/shared/ui/button";
import { Field, Input, Textarea } from "@/shared/ui/form";
import { SubmitButton } from "@/shared/ui/submit-button";
import { Badge } from "@/shared/ui/surface";

import { markBilled, settleOrder, updateOrderMeta } from "../actions";

const methods = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "upi", label: "UPI", icon: Smartphone },
] as const;

export function OrderSummary({ order }: { order: Order }) {
  const live = order.status === "open" || order.status === "billed";
  const voidedNote = Number(order.subtotal) === 0 && order.status === "open";

  return (
    <div className="space-y-3">
      <dl className="space-y-1.5 text-sm">
        <Row label="Subtotal" value={formatMoney(order.subtotal)} />
        {Number(order.discount) > 0 ? (
          <Row
            label={`Discount${order.discount_reason ? ` · ${order.discount_reason}` : ""}`}
            value={`− ${formatMoney(order.discount)}`}
            tone="discount"
          />
        ) : null}
        <div className="flex items-baseline justify-between border-t border-slate-200 pt-2">
          <dt className="text-sm font-semibold text-slate-900">To pay</dt>
          <dd className="text-2xl font-semibold text-brand-800 tabular-nums">
            {formatMoney(order.total)}
          </dd>
        </div>
      </dl>

      {order.status === "paid" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Settled by {order.payment_method?.toUpperCase()}.
        </div>
      ) : null}

      {order.status === "cancelled" ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Cancelled{order.cancel_reason ? ` — ${order.cancel_reason}` : ""}.
        </div>
      ) : null}

      {live ? (
        <>
          <Link
            href={`/admin/bills/${order.id}`}
            className={buttonClass({ variant: "outline", size: "md", className: "w-full" })}
          >
            <Printer className="size-4" aria-hidden />
            Print bill
          </Link>

          {order.status === "open" ? (
            <ActionForm action={markBilled} announceSuccess>
              <input type="hidden" name="orderId" value={order.id} />
              <SubmitButton
                variant="secondary"
                size="md"
                className="w-full"
                disabled={voidedNote}
              >
                Mark as billed
              </SubmitButton>
            </ActionForm>
          ) : (
            <Badge tone="spice">Bill printed · waiting for payment</Badge>
          )}

          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">
              Settle {formatMoney(order.total)}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {methods.map(({ value, label, icon: Icon }) => (
                <ActionForm key={value} action={settleOrder} announceSuccess>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="paymentMethod" value={value} />
                  <SubmitButton
                    variant="primary"
                    size="md"
                    className="w-full flex-col gap-0.5 py-6 text-xs"
                    pendingLabel="…"
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </SubmitButton>
                </ActionForm>
              ))}
            </div>
          </div>
        </>
      ) : (
        <Link
          href={`/admin/bills/${order.id}`}
          className={buttonClass({ variant: "outline", size: "md", className: "w-full" })}
        >
          <Printer className="size-4" aria-hidden />
          View bill
        </Link>
      )}

      {live ? (
        <ActionForm
          action={updateOrderMeta}
          announceSuccess
          className="space-y-3 rounded-xl border border-slate-200 p-3"
        >
          <input type="hidden" name="orderId" value={order.id} />
          <Field label="Guests" htmlFor="order-guests">
            <Input
              id="order-guests"
              name="guestCount"
              type="number"
              min={0}
              max={99}
              defaultValue={order.guest_count}
              inputMode="numeric"
            />
          </Field>
          <Field label="Note on the bill" htmlFor="order-notes">
            <Textarea
              id="order-notes"
              name="notes"
              rows={2}
              maxLength={500}
              defaultValue={order.notes ?? ""}
              placeholder="Birthday, allergy, split payment…"
            />
          </Field>
          <SubmitButton size="sm" variant="outline" className="w-full">
            Save
          </SubmitButton>
        </ActionForm>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "discount";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-slate-600">{label}</dt>
      <dd
        className={
          tone === "discount"
            ? "font-medium text-spice-700 tabular-nums"
            : "font-medium text-slate-900 tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}
