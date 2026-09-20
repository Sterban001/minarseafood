import Link from "next/link";
import { Plus, Receipt, Users } from "lucide-react";

import { ActionForm } from "@/modules/admin/components/action-form";
import { Elapsed } from "@/modules/admin/components/elapsed";
import { Popover } from "@/modules/admin/components/popover";
import { formatMoney } from "@/shared/lib/money";
import type { AppRole } from "@/shared/types/database";
import { Field, Input, Select } from "@/shared/ui/form";
import { SubmitButton } from "@/shared/ui/submit-button";
import { cn } from "@/shared/ui/cn";

import { openOrder } from "../actions";
import type { FloorSlot } from "../queries";

type Props = {
  slots: FloorSlot[];
  role: AppRole;
  waiters: { id: string; full_name: string }[];
  currentUserId: string;
};

export function FloorGrid({ slots, role, waiters, currentUserId }: Props) {
  const zones = groupByZone(slots);

  return (
    <div className="space-y-8">
      {zones.map(([zone, zoneSlots]) => (
        <section key={zone}>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.15em] text-slate-500 uppercase">
            {zone}
            <span className="font-sans text-[0.7rem] tracking-normal normal-case text-slate-400">
              {zoneSlots.filter((slot) => slot.orderId).length} of {zoneSlots.length} busy
            </span>
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {zoneSlots.map((slot) => (
              <TableTile
                key={slot.orderId ?? slot.tableId ?? slot.tableLabel}
                slot={slot}
                role={role}
                waiters={waiters}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TableTile({
  slot,
  role,
  waiters,
  currentUserId,
}: {
  slot: FloorSlot;
  role: AppRole;
  waiters: { id: string; full_name: string }[];
  currentUserId: string;
}) {
  const free = !slot.orderId;
  const billed = slot.status === "billed";

  // A waiter can see that a table is taken, but only opens their own.
  const canOpen = slot.orderId
    ? role !== "waiter" || slot.waiterId === currentUserId
    : true;

  if (free) {
    return (
      <Popover
        label={
          <span className="flex w-full flex-col items-start gap-1">
            <span className="text-base font-semibold text-slate-800">
              {slot.tableLabel}
            </span>
            <span className="text-xs font-normal text-slate-400">
              {slot.seats} seats · free
            </span>
          </span>
        }
        variant="outline"
        align="left"
        width="w-64"
        className="[&>button]:h-auto [&>button]:w-full [&>button]:items-start [&>button]:border-dashed [&>button]:px-3 [&>button]:py-3"
      >
        <ActionForm action={openOrder} className="space-y-3">
          <p className="text-sm font-semibold text-slate-800">
            Open {slot.tableLabel}
          </p>
          <input type="hidden" name="tableId" value={slot.tableId ?? ""} />

          <Field label="Guests" htmlFor={`guests-${slot.tableId}`}>
            <Input
              id={`guests-${slot.tableId}`}
              name="guestCount"
              type="number"
              min={1}
              max={99}
              defaultValue={slot.seats || 2}
              inputMode="numeric"
            />
          </Field>

          {role !== "waiter" ? (
            <Field label="Waiter" htmlFor={`waiter-${slot.tableId}`}>
              <Select
                id={`waiter-${slot.tableId}`}
                name="waiterId"
                defaultValue={currentUserId}
              >
                {waiters.map((waiter) => (
                  <option key={waiter.id} value={waiter.id}>
                    {waiter.full_name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <SubmitButton size="md" className="w-full" pendingLabel="Opening…">
            <Plus className="size-4" aria-hidden />
            Start order
          </SubmitButton>
        </ActionForm>
      </Popover>
    );
  }

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-base font-semibold">{slot.tableLabel}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase",
            billed ? "bg-spice-100 text-spice-800" : "bg-white/20 text-white",
          )}
        >
          {billed ? "Billed" : `#${slot.orderNo}`}
        </span>
      </div>

      <p className="mt-2 truncate text-xs opacity-90">{slot.waiterName ?? "Unassigned"}</p>

      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="text-lg font-semibold tabular-nums">
          {formatMoney(slot.total)}
        </span>
        <span className="flex items-center gap-2 text-xs opacity-90">
          <span className="flex items-center gap-1">
            <Users className="size-3.5" aria-hidden />
            {slot.guestCount}
          </span>
          <span className="flex items-center gap-1">
            <Receipt className="size-3.5" aria-hidden />
            {slot.itemCount}
          </span>
        </span>
      </div>

      <p className="mt-1 text-xs opacity-75">
        <Elapsed since={slot.openedAt} />
      </p>
    </>
  );

  const tone = billed
    ? "bg-spice-600 text-white"
    : slot.isMine
      ? "bg-brand-700 text-white"
      : "bg-slate-600 text-white";

  if (!canOpen) {
    return (
      <div
        className={cn(
          "cursor-not-allowed rounded-xl px-3 py-3 opacity-80",
          tone,
        )}
        title={`${slot.waiterName} is looking after this table`}
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/admin/orders/${slot.orderId}`}
      className={cn(
        "rounded-xl px-3 py-3 transition-transform hover:-translate-y-0.5 hover:shadow-md",
        tone,
      )}
    >
      {body}
    </Link>
  );
}

function groupByZone(slots: FloorSlot[]): [string, FloorSlot[]][] {
  const zones = new Map<string, FloorSlot[]>();
  for (const slot of slots) {
    const list = zones.get(slot.zone);
    if (list) list.push(slot);
    else zones.set(slot.zone, [slot]);
  }
  return [...zones.entries()];
}
