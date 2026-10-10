import type { Metadata } from "next";
import Link from "next/link";
import { Eye, EyeOff, MapPin, Pencil, Plus, Printer, ShoppingBag, Trash2 } from "lucide-react";

import { ActionForm } from "@/modules/admin/components/action-form";
import { PageHeader } from "@/modules/admin/components/admin-shell";
import { Popover } from "@/modules/admin/components/popover";
import { requireManager } from "@/modules/admin/auth/session";
import {
  createTable,
  deleteTable,
  toggleTableActive,
  updateTable,
} from "@/modules/admin/tables/actions";
import { createServerSupabase } from "@/shared/supabase/server";
import type { DiningTable } from "@/shared/types/database";
import { Field, Input, Select } from "@/shared/ui/form";
import { SubmitButton } from "@/shared/ui/submit-button";
import { Badge, Card, CardHeader, EmptyState } from "@/shared/ui/surface";

import { getLiveTablesStatus, type LiveTableInfo } from "@/modules/admin/sales/queries";
import { formatMoney } from "@/shared/lib/money";
import { cn } from "@/shared/ui/cn";

export const metadata: Metadata = { title: "Tables & Takeaways — Minar Sea Food" };

const ZONES = ["Main Hall", "AC Hall", "Family Rooms", "Rooftop", "Takeaway"];

export default async function TablesAdminPage() {
  await requireManager();
  const supabase = await createServerSupabase();

  const [tablesRes, liveMap] = await Promise.all([
    supabase
      .from("dining_tables")
      .select("*")
      .order("sort_order")
      .order("label"),
    getLiveTablesStatus(),
  ]);

  if (tablesRes.error) throw new Error(tablesRes.error.message);

  const allTables = tablesRes.data ?? [];
  const active = allTables.filter((t) => t.is_active).length;
  const liveCount = Object.keys(liveMap).length;
  const liveDineIn = allTables.filter((t) => t.zone !== "Takeaway" && liveMap[t.id]?.isLive).length;
  const liveTakeaway = allTables.filter((t) => t.zone === "Takeaway" && liveMap[t.id]?.isLive).length;
  const inactive = allTables.length - active;

  // Group by zone
  const byZone = allTables.reduce<Record<string, DiningTable[]>>((acc, t) => {
    (acc[t.zone] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Tables & Takeaways"
        subtitle={
          <span>
            <strong className="text-slate-900">{active}</strong> active
            {liveDineIn > 0 ? (
              <span className="ml-2 font-semibold text-emerald-600">
                · 🟢 {liveDineIn} Live {liveDineIn === 1 ? "table" : "tables"}
              </span>
            ) : null}
            {liveTakeaway > 0 ? (
              <span className="ml-2 font-semibold text-amber-700">
                · 🛍️ {liveTakeaway} Live {liveTakeaway === 1 ? "takeaway" : "takeaways"}
              </span>
            ) : null}
            {inactive > 0 ? (
              <span className="ml-1.5 text-slate-400">
                · {inactive} hidden
              </span>
            ) : null}
          </span>
        }
        actions={
          <Popover label={<><Plus className="size-4" /> Add Table / Slot</>} align="right">
            <ActionForm action={createTable} announceSuccess className="space-y-3">
              <Field label="Label" htmlFor="label" required>
                <Input
                  id="label"
                  name="label"
                  placeholder="e.g. T9"
                  required
                  autoFocus
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Seats" htmlFor="seats">
                  <Input
                    id="seats"
                    name="seats"
                    type="number"
                    min={1}
                    max={40}
                    defaultValue={4}
                  />
                </Field>
                <Field label="Sort order" htmlFor="sort_order">
                  <Input
                    id="sort_order"
                    name="sort_order"
                    type="number"
                    defaultValue={0}
                  />
                </Field>
              </div>
              <Field label="Zone" htmlFor="zone">
                <Select id="zone" name="zone" defaultValue="Main Hall">
                  {ZONES.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </Select>
              </Field>
              <SubmitButton className="w-full">Add Table</SubmitButton>
            </ActionForm>
          </Popover>
        }
      />

      {allTables.length === 0 ? (
        <EmptyState
          title="No tables yet"
          description="Add your restaurant's dining tables to link them to sales and print table-specific bills."
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(byZone).map(([zone, zoneTables]) => (
            <div key={zone}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {zone}
                <span className="ml-1.5 text-slate-300">
                  ({zoneTables.length})
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {zoneTables.map((table) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    liveInfo={liveMap[table.id]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TableCard({
  table,
  liveInfo,
}: {
  table: DiningTable;
  liveInfo?: LiveTableInfo;
}) {
  const isLive = Boolean(liveInfo?.isLive);
  const isTakeaway =
    table.zone === "Takeaway" ||
    table.label.toLowerCase().includes("takeaway") ||
    table.label.toLowerCase().startsWith("tk");

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between rounded-xl border p-3.5 transition-all shadow-xs",
        isLive
          ? "border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-500/25 shadow-md"
          : isTakeaway
            ? "border-amber-200/80 bg-amber-50/30"
            : table.is_active
              ? "border-slate-200 bg-white"
              : "border-slate-200 bg-slate-50 opacity-50",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg font-bold transition-all",
            isLive
              ? "bg-emerald-600 text-white shadow-xs animate-pulse"
              : isTakeaway
                ? "bg-amber-100 text-amber-800"
                : "bg-brand-50 text-brand-700",
          )}
        >
          {isTakeaway ? <ShoppingBag className="size-5" /> : <MapPin className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-base font-bold text-slate-900">{table.label}</p>
            {isLive ? (
              <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[0.68rem] font-bold text-white shadow-xs">
                🟢 LIVE
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">
            {isTakeaway
              ? "Counter Takeaway Slot"
              : `${table.seats} ${table.seats === 1 ? "seat" : "seats"} · ${table.zone}`}
          </p>
          {isLive && liveInfo ? (
            <p className="mt-1 text-xs font-bold text-emerald-800 tabular-nums">
              Unbilled: {formatMoney(liveInfo.unbilledTotal)} ({liveInfo.unbilledSalesCount} {liveInfo.unbilledSalesCount === 1 ? "order" : "orders"})
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          {!table.is_active ? (
            <Badge tone="warning">Hidden</Badge>
          ) : null}

          {/* Print Consolidated Bill */}
          <Link
            href={`/admin/table-receipt/${table.id}`}
            target="_blank"
            title={isTakeaway ? `Print full bill for ${table.label}` : `Print full bill for Table ${table.label}`}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              isLive
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : isTakeaway
                  ? "text-amber-700 hover:bg-amber-100"
                  : "text-slate-500 hover:bg-brand-50 hover:text-brand-700",
            )}
          >
            <Printer className="size-4" />
          </Link>

          {/* Toggle active */}
          <ActionForm action={toggleTableActive}>
            <input type="hidden" name="id" value={table.id} />
            <input type="hidden" name="is_active" value={String(table.is_active)} />
            <button
              type="submit"
              title={table.is_active ? "Hide table" : "Show table"}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              {table.is_active ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </ActionForm>

          {/* Edit */}
          <Popover
            label={<Pencil className="size-4" />}
            variant="ghost"
            size="sm"
            align="right"
          >
            <ActionForm action={updateTable} announceSuccess className="space-y-3">
              <input type="hidden" name="id" value={table.id} />
              <Field label="Label" htmlFor={`label-${table.id}`} required>
                <Input
                  id={`label-${table.id}`}
                  name="label"
                  defaultValue={table.label}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Seats" htmlFor={`seats-${table.id}`}>
                  <Input
                    id={`seats-${table.id}`}
                    name="seats"
                    type="number"
                    min={1}
                    max={40}
                    defaultValue={table.seats}
                  />
                </Field>
                <Field label="Sort order" htmlFor={`sort-${table.id}`}>
                  <Input
                    id={`sort-${table.id}`}
                    name="sort_order"
                    type="number"
                    defaultValue={table.sort_order}
                  />
                </Field>
              </div>
              <Field label="Zone" htmlFor={`zone-${table.id}`}>
                <Select id={`zone-${table.id}`} name="zone" defaultValue={table.zone}>
                  {ZONES.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </Select>
              </Field>
              <SubmitButton className="w-full">Save</SubmitButton>
            </ActionForm>
          </Popover>

          {/* Delete */}
          <Popover
            label={<Trash2 className="size-4" />}
            variant="ghost"
            size="sm"
            align="right"
            width="w-56"
          >
            <p className="mb-3 text-sm text-slate-600">
              Delete <strong>{table.label}</strong>? Sales already linked to this table will keep their reference.
            </p>
            <ActionForm action={deleteTable}>
              <input type="hidden" name="id" value={table.id} />
              <SubmitButton variant="danger" className="w-full" pendingLabel="Deleting…">
                Delete
              </SubmitButton>
            </ActionForm>
          </Popover>
        </div>
      </div>

      {/* Bottom action row for live tables */}
      {isLive ? (
        <div className="mt-3 flex items-center justify-between border-t border-emerald-200/80 pt-2.5">
          <Link
            href={`/admin/table-receipt/${table.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-700"
          >
            <Printer className="size-3.5" />
            {isTakeaway ? "Print & Settle Takeaway" : "Print & Settle Table"}
          </Link>

          <form
            action={async () => {
              "use server";
              const { settleTableBill } = await import("@/modules/admin/sales/actions");
              await settleTableBill(table.id);
            }}
          >
            <button
              type="submit"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline"
            >
              Settle
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
