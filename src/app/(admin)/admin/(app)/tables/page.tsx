import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";

import { ActionForm } from "@/modules/admin/components/action-form";
import { PageHeader } from "@/modules/admin/components/admin-shell";
import { Popover } from "@/modules/admin/components/popover";
import { RealtimeRefresh } from "@/modules/admin/components/realtime-refresh";
import { requireStaff } from "@/modules/admin/auth/session";
import { openOrder } from "@/modules/admin/pos/actions";
import { FloorGrid } from "@/modules/admin/pos/components/floor-grid";
import { getActiveWaiters, getFloor } from "@/modules/admin/pos/queries";
import { formatMoney } from "@/shared/lib/money";
import { SubmitButton } from "@/shared/ui/submit-button";
import { EmptyState } from "@/shared/ui/surface";

export const metadata: Metadata = { title: "Floor" };

export default async function FloorPage() {
  const { profile, userId } = await requireStaff();
  const [slots, waiters] = await Promise.all([getFloor(), getActiveWaiters()]);

  const live = slots.filter((slot) => slot.orderId);
  const running = live.reduce((sum, slot) => sum + slot.total, 0);
  const covers = live.reduce((sum, slot) => sum + slot.guestCount, 0);

  return (
    <>
      <PageHeader
        title="Floor"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <RealtimeRefresh channel="floor" />
            <span>
              {live.length} live {live.length === 1 ? "table" : "tables"} · {covers} covers
              seated · {formatMoney(running)} on the floor
            </span>
          </span>
        }
        actions={
          <Popover
            label={
              <>
                <ShoppingBag className="size-4" aria-hidden />
                Takeaway
              </>
            }
            variant="secondary"
            size="md"
          >
            <ActionForm action={openOrder} className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">
                Open a takeaway order
              </p>
              <p className="text-xs text-slate-500">
                No table is held. It shows up under the Counter section.
              </p>
              <input type="hidden" name="tableId" value="" />
              <input type="hidden" name="guestCount" value="0" />
              <input type="hidden" name="waiterId" value={userId} />

              <SubmitButton size="md" className="w-full" pendingLabel="Opening…">
                Start takeaway order
              </SubmitButton>
            </ActionForm>
          </Popover>
        }
      />

      {slots.length === 0 ? (
        <EmptyState
          title="No tables set up yet"
          description="A manager needs to add the floor plan under Table setup before orders can be opened."
        />
      ) : (
        <FloorGrid
          slots={slots}
          role={profile.role}
          waiters={waiters}
          currentUserId={userId}
        />
      )}

      <Legend />
    </>
  );
}

function Legend() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-4 text-xs text-slate-500">
      <Swatch className="border border-dashed border-slate-300 bg-white" label="Free" />
      <Swatch className="bg-brand-700" label="My table" />
      <Swatch className="bg-slate-600" label="Another waiter" />
      <Swatch className="bg-spice-600" label="Bill printed, awaiting payment" />
    </div>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`size-3.5 rounded ${className}`} aria-hidden />
      {label}
    </span>
  );
}
