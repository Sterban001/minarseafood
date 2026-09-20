import { Ban, Minus, NotebookPen, Plus } from "lucide-react";

import { ActionForm } from "@/modules/admin/components/action-form";
import { Popover } from "@/modules/admin/components/popover";
import { formatMoney } from "@/shared/lib/money";
import { formatTime } from "@/shared/lib/dates";
import type { OrderItem } from "@/shared/types/database";
import { Field, Input, Textarea } from "@/shared/ui/form";
import { SubmitButton } from "@/shared/ui/submit-button";
import { EmptyState } from "@/shared/ui/surface";

import { setItemNote, stepItemQty, voidItem } from "../actions";

type Props = {
  orderId: string;
  items: OrderItem[];
  addedByNames: Record<string, string>;
  /** False once the bill is printed, settled or cancelled. */
  editable: boolean;
  canVoid: boolean;
};

export function OrderTicket({ orderId, items, addedByNames, editable, canVoid }: Props) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing punched yet"
        description="Tap dishes on the right to build the ticket."
      />
    );
  }

  return (
    <ul className="divide-y divide-slate-200">
      {items.map((item) => (
        <TicketLine
          key={item.id}
          orderId={orderId}
          item={item}
          addedBy={item.added_by ? addedByNames[item.added_by] : undefined}
          editable={editable}
          canVoid={canVoid}
        />
      ))}
    </ul>
  );
}

function TicketLine({
  orderId,
  item,
  addedBy,
  editable,
  canVoid,
}: {
  orderId: string;
  item: OrderItem;
  addedBy?: string;
  editable: boolean;
  canVoid: boolean;
}) {
  const voided = item.voided_at !== null;

  return (
    <li className={voided ? "bg-red-50/40 py-2.5" : "py-2.5"}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={
              voided
                ? "text-sm font-medium text-slate-400 line-through"
                : "text-sm font-medium text-slate-900"
            }
          >
            {item.name_snapshot}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatMoney(item.unit_price_snapshot)} each
            {addedBy ? ` · ${addedBy}` : ""} · {formatTime(item.created_at)}
          </p>
          {item.notes ? (
            <p className="mt-1 rounded bg-spice-50 px-2 py-1 text-xs font-medium text-spice-800">
              {item.notes}
            </p>
          ) : null}
          {voided ? (
            <p className="mt-1 text-xs font-medium text-red-600">
              Voided{item.void_reason ? ` — ${item.void_reason}` : ""}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {editable && !voided ? (
            <QtyStepper orderId={orderId} item={item} />
          ) : (
            <span className="w-8 text-center text-sm font-semibold text-slate-500 tabular-nums">
              {item.qty}
            </span>
          )}

          <span className="w-16 text-right text-sm font-semibold text-slate-900 tabular-nums">
            {formatMoney(item.line_total)}
          </span>
        </div>
      </div>

      {editable && !voided ? (
        <div className="mt-1.5 flex justify-end gap-1.5">
          <Popover
            label={
              <>
                <NotebookPen className="size-3.5" aria-hidden />
                {item.notes ? "Edit note" : "Note"}
              </>
            }
            variant="ghost"
            size="sm"
            width="w-64"
          >
            <ActionForm action={setItemNote} className="space-y-2">
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="orderId" value={orderId} />
              <Field label="Note for the kitchen" htmlFor={`note-${item.id}`}>
                <Textarea
                  id={`note-${item.id}`}
                  name="note"
                  rows={2}
                  maxLength={200}
                  defaultValue={item.notes ?? ""}
                  placeholder="No chilli, extra lime, half portion…"
                />
              </Field>
              <SubmitButton size="sm" className="w-full">
                Save note
              </SubmitButton>
            </ActionForm>
          </Popover>

          {canVoid ? (
            <Popover
              label={
                <>
                  <Ban className="size-3.5" aria-hidden />
                  Void
                </>
              }
              variant="ghost"
              size="sm"
              width="w-64"
            >
              <ActionForm action={voidItem} className="space-y-2">
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="orderId" value={orderId} />
                <p className="text-xs text-slate-600">
                  Voiding keeps the line on the bill at zero and records who did it.
                </p>
                <Field label="Reason" htmlFor={`void-${item.id}`} required>
                  <Input
                    id={`void-${item.id}`}
                    name="reason"
                    placeholder="Sent back, wrong order, spillage…"
                    required
                    minLength={3}
                  />
                </Field>
                <SubmitButton size="sm" variant="danger" className="w-full">
                  Void {item.name_snapshot}
                </SubmitButton>
              </ActionForm>
            </Popover>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function QtyStepper({ orderId, item }: { orderId: string; item: OrderItem }) {
  return (
    <div className="flex items-center gap-1">
      <StepButton orderId={orderId} itemId={item.id} delta={-1} label="One less">
        <Minus className="size-3.5" aria-hidden />
      </StepButton>
      <span className="w-7 text-center text-sm font-semibold text-slate-900 tabular-nums">
        {item.qty}
      </span>
      <StepButton orderId={orderId} itemId={item.id} delta={1} label="One more">
        <Plus className="size-3.5" aria-hidden />
      </StepButton>
    </div>
  );
}

function StepButton({
  orderId,
  itemId,
  delta,
  label,
  children,
}: {
  orderId: string;
  itemId: string;
  delta: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <ActionForm
      action={stepItemQty}
      className="relative"
      messageClassName="absolute top-full right-0 z-20 mt-1 w-56 shadow-md"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="delta" value={delta} />
      <SubmitButton
        aria-label={label}
        variant="outline"
        size="sm"
        className="size-8 px-0"
        pendingLabel="…"
      >
        {children}
      </SubmitButton>
    </ActionForm>
  );
}
