import type { Metadata } from "next";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { ActionForm } from "@/modules/admin/components/action-form";
import { PageHeader } from "@/modules/admin/components/admin-shell";
import { Popover } from "@/modules/admin/components/popover";
import { requireManager } from "@/modules/admin/auth/session";
import { deleteSection, deleteTable, saveSection, saveTable } from "@/modules/admin/menu/actions";
import { createServerSupabase } from "@/shared/supabase/server";
import type { DiningTable } from "@/shared/types/database";
import { Field, Input } from "@/shared/ui/form";
import { SubmitButton } from "@/shared/ui/submit-button";
import { Badge, Card, CardHeader, EmptyState } from "@/shared/ui/surface";

export const metadata: Metadata = { title: "Table setup" };

export default async function FloorSetupPage() {
  await requireManager();
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("dining_tables")
    .select("*")
    .order("sort_order")
    .order("label");

  if (error) throw new Error(error.message);

  const tables = data ?? [];
  const zones = [...new Set(tables.map((table) => table.zone))];
  const seats = tables
    .filter((table) => table.is_active)
    .reduce((sum, table) => sum + table.seats, 0);

  return (
    <>
      <PageHeader
        title="Table setup"
        subtitle={`${tables.filter((table) => table.is_active).length} active tables · ${seats} seats · ${zones.length} areas`}
        actions={
          <>
            <Popover
              label={
                <>
                  <Plus className="size-4" aria-hidden />
                  Section
                </>
              }
              variant="outline"
              size="md"
              width="w-72"
            >
              <SectionForm />
            </Popover>

            <Popover
              label={
                <>
                  <Plus className="size-4" aria-hidden />
                  Add table
                </>
              }
              variant="primary"
              size="md"
              width="w-72"
            >
              <TableForm zones={zones} />
            </Popover>
          </>
        }
      />

      {tables.length === 0 ? (
        <EmptyState
          title="No tables yet"
          description="Add your tables here and they show up on the floor screen straight away."
        />
      ) : (
        <div className="space-y-4">
          {zones.map((zone) => (
            <ZoneBlock
              key={zone}
              zone={zone}
              tables={tables.filter((table) => table.zone === zone)}
              zones={zones}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ZoneBlock({
  zone,
  tables,
  zones,
}: {
  zone: string;
  tables: DiningTable[];
  zones: string[];
}) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {zone}
            <span className="text-xs font-normal text-slate-400">
              {tables.length} {tables.length === 1 ? "table" : "tables"}
            </span>
          </span>
        }
        subtitle={`${tables.filter((t) => t.is_active).length} active`}
        action={
          <div className="flex gap-1.5">
            <Popover
              label={<Pencil className="size-3.5" aria-hidden />}
              variant="ghost"
              width="w-72"
            >
              <SectionForm zone={zone} />
            </Popover>
            <Popover
              label={<Trash2 className="size-3.5" aria-hidden />}
              variant="ghost"
              width="w-64"
            >
              <ActionForm
                action={deleteSection}
                announceSuccess
                className="space-y-2"
              >
                <input type="hidden" name="zone" value={zone} />
                <p className="text-xs text-slate-600">
                  Delete the &ldquo;{zone}&rdquo; section and all its tables?
                  Tables with past sales will be switched off instead of
                  deleted, so reports keep working.
                </p>
                <SubmitButton size="sm" variant="danger" className="w-full">
                  Delete section
                </SubmitButton>
              </ActionForm>
            </Popover>
          </div>
        }
      />
      <ul className="divide-y divide-slate-200">
        {tables.map((table) => (
          <li
            key={table.id}
            className="flex items-center gap-3 px-4 py-2.5 text-sm"
          >
            <span className="w-16 font-semibold text-slate-900">
              {table.label}
            </span>
            <span className="text-slate-500">{table.seats} seats</span>
            <span className="text-xs text-slate-400">
              sort {table.sort_order}
            </span>
            {table.is_active ? null : <Badge tone="warning">Switched off</Badge>}

            <span className="ml-auto flex gap-1.5">
              <Popover
                label={<Pencil className="size-3.5" aria-hidden />}
                variant="ghost"
                width="w-72"
              >
                <TableForm table={table} zones={zones} />
              </Popover>
              <Popover
                label={<Trash2 className="size-3.5" aria-hidden />}
                variant="ghost"
                width="w-64"
              >
                <ActionForm
                  action={deleteTable}
                  announceSuccess
                  className="space-y-2"
                >
                  <input type="hidden" name="id" value={table.id} />
                  <p className="text-xs text-slate-600">
                    Remove {table.label}? If it has past sales it will be
                    switched off instead, so turnover reports keep working.
                  </p>
                  <SubmitButton size="sm" variant="danger" className="w-full">
                    Remove table
                  </SubmitButton>
                </ActionForm>
              </Popover>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SectionForm({ zone }: { zone?: string }) {
  const key = zone ?? "new";

  return (
    <ActionForm action={saveSection} announceSuccess className="space-y-3">
      {zone ? <input type="hidden" name="oldZone" value={zone} /> : null}

      <Field label="Section name" htmlFor={`sec-name-${key}`} required>
        <Input
          id={`sec-name-${key}`}
          name="name"
          defaultValue={zone ?? ""}
          placeholder="Main Hall"
          required
          minLength={2}
        />
      </Field>

      <SubmitButton size="md" className="w-full">
        {zone ? "Rename section" : "Add section"}
      </SubmitButton>
    </ActionForm>
  );
}

function TableForm({ table, zones }: { table?: DiningTable; zones: string[] }) {
  const key = table?.id ?? "new";

  return (
    <ActionForm action={saveTable} announceSuccess className="space-y-3">
      {table ? <input type="hidden" name="id" value={table.id} /> : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Label" htmlFor={`label-${key}`} required>
          <Input
            id={`label-${key}`}
            name="label"
            defaultValue={table?.label ?? ""}
            placeholder="AC3"
            required
          />
        </Field>
        <Field label="Seats" htmlFor={`seats-${key}`}>
          <Input
            id={`seats-${key}`}
            name="seats"
            type="number"
            min={1}
            max={40}
            defaultValue={table?.seats ?? 4}
            inputMode="numeric"
          />
        </Field>
      </div>

      <Field label="Area" htmlFor={`zone-${key}`} hint="Groups the floor screen.">
        <Input
          id={`zone-${key}`}
          name="zone"
          list={`zones-${key}`}
          defaultValue={table?.zone ?? zones[0] ?? "Main Hall"}
          placeholder="Main Hall"
        />
        <datalist id={`zones-${key}`}>
          {zones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
      </Field>

      <Field label="Sort order" htmlFor={`tsort-${key}`} hint="Lower shows first.">
        <Input
          id={`tsort-${key}`}
          name="sortOrder"
          type="number"
          defaultValue={table?.sort_order ?? 0}
          inputMode="numeric"
        />
      </Field>

      <label
        htmlFor={`tactive-${key}`}
        className="flex items-center gap-2 text-sm text-slate-700"
      >
        <input
          id={`tactive-${key}`}
          name="isActive"
          type="checkbox"
          defaultChecked={table?.is_active ?? true}
          className="size-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
        />
        Available for orders
      </label>

      <SubmitButton size="md" className="w-full">
        {table ? "Save table" : "Add table"}
      </SubmitButton>
    </ActionForm>
  );
}
