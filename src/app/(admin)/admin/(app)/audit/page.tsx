import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  actionLabel,
  actionTone,
  auditActionGroups,
  auditEntities,
  changeFields,
  entityLabel,
  relatedOrderId,
} from "@/modules/admin/audit/format";
import { getAuditActors, getAuditEntries } from "@/modules/admin/audit/queries";
import { PageHeader } from "@/modules/admin/components/admin-shell";
import { requireSuperAdmin, roleLabels } from "@/modules/admin/auth/session";
import { formatDateTime } from "@/shared/lib/dates";
import type { AppRole, AuditEntry } from "@/shared/types/database";
import { buttonClass } from "@/shared/ui/button";
import { Field, Select } from "@/shared/ui/form";
import { Badge, Card } from "@/shared/ui/surface";
import { DataTable, type Column } from "@/shared/ui/table";

export const metadata: Metadata = { title: "Audit trail" };

const isAppRole = (value: string | null): value is AppRole =>
  value === "super_admin" || value === "manager" || value === "waiter";

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireSuperAdmin();

  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) || undefined;
  };

  const filters = {
    actorId: one("actor"),
    action: one("action"),
    entity: one("entity"),
    before: Number(one("before")) || undefined,
  };

  const [{ entries, hasOlder }, actors] = await Promise.all([
    getAuditEntries(filters),
    getAuditActors(),
  ]);

  // The filters travel with the paging links; `before` is dropped whenever the
  // filter form is submitted, which puts you back on the newest page.
  const filterQuery = new URLSearchParams();
  if (filters.actorId) filterQuery.set("actor", filters.actorId);
  if (filters.action) filterQuery.set("action", filters.action);
  if (filters.entity) filterQuery.set("entity", filters.entity);

  const hasFilters = Boolean(filters.actorId || filters.action || filters.entity);
  const newestHref = `/admin/audit${hasFilters ? `?${filterQuery}` : ""}`;
  const oldest = entries.at(-1);
  const olderQuery = new URLSearchParams(filterQuery);
  if (oldest) olderQuery.set("before", String(oldest.id));

  return (
    <>
      <PageHeader
        title="Audit trail"
        subtitle="Written by database triggers, so it cannot be skipped or edited from the app"
      />

      <form
        method="get"
        action="/admin/audit"
        className="print-hidden mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3"
      >
        <div className="w-52">
          <Field label="Who" htmlFor="audit-actor">
            <Select id="audit-actor" name="actor" defaultValue={filters.actorId ?? ""}>
              <option value="">Anyone</option>
              {actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.full_name} — {roleLabels[actor.role]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="w-52">
          <Field label="Did what" htmlFor="audit-action">
            <Select id="audit-action" name="action" defaultValue={filters.action ?? ""}>
              <option value="">Anything</option>
              {auditActionGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.actions.map((action) => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
        </div>

        <div className="w-44">
          <Field label="To what" htmlFor="audit-entity">
            <Select id="audit-entity" name="entity" defaultValue={filters.entity ?? ""}>
              <option value="">Everything</option>
              {auditEntities.map((entity) => (
                <option key={entity.value} value={entity.value}>
                  {entity.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <button type="submit" className={buttonClass({ variant: "outline", size: "md" })}>
          Apply
        </button>

        {hasFilters ? (
          <Link
            href="/admin/audit"
            className="px-1 py-2 text-sm text-slate-500 hover:text-slate-800"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <Card>
        <DataTable
          rows={entries}
          columns={columns}
          rowKey={(entry) => String(entry.id)}
          emptyLabel={
            filters.before
              ? "Nothing older than this."
              : "Nothing has been logged yet."
          }
        />
      </Card>

      {filters.before || hasOlder ? (
        <div className="print-hidden mt-3 flex items-center justify-between">
          {filters.before ? (
            <Link
              href={newestHref}
              className={buttonClass({ variant: "outline", size: "sm" })}
            >
              <ChevronLeft className="size-4" aria-hidden />
              Newest
            </Link>
          ) : (
            <span />
          )}

          {hasOlder && oldest ? (
            <Link
              href={`/admin/audit?${olderQuery}`}
              className={buttonClass({ variant: "outline", size: "sm" })}
            >
              Older
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </>
  );
}

const columns: Column<AuditEntry>[] = [
  {
    key: "at",
    header: "When",
    cell: (entry) => (
      <span className="whitespace-nowrap text-slate-600">{formatDateTime(entry.at)}</span>
    ),
  },
  {
    key: "actor",
    header: "Who",
    cell: (entry) => (
      <span className="whitespace-nowrap">
        <span className="font-medium text-slate-900">
          {entry.actor_name ?? "System"}
        </span>
        {isAppRole(entry.actor_role) ? (
          <span className="ml-1.5 text-xs text-slate-400">
            {roleLabels[entry.actor_role]}
          </span>
        ) : null}
      </span>
    ),
  },
  {
    key: "action",
    header: "Action",
    cell: (entry) => (
      <Badge tone={actionTone(entry.action)}>{actionLabel(entry.action)}</Badge>
    ),
  },
  {
    key: "entity",
    header: "On",
    secondary: true,
    cell: (entry) => <EntityCell entry={entry} />,
  },
  {
    key: "change",
    header: "Change",
    cell: (entry) => <Changes entry={entry} />,
  },
];

function EntityCell({ entry }: { entry: AuditEntry }) {
  const orderId = relatedOrderId(entry);
  const href =
    entry.entity === "profiles" && entry.entity_id
      ? `/admin/reports/waiters/${entry.entity_id}`
      : orderId
        ? `/admin/orders/${orderId}`
        : null;

  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-slate-600">{entityLabel(entry.entity)}</span>
      {href ? (
        <Link href={href} className="text-xs font-medium text-brand-700 hover:text-brand-900">
          open
        </Link>
      ) : null}
    </span>
  );
}

function Changes({ entry }: { entry: AuditEntry }) {
  const fields = changeFields(entry);

  if (fields.length === 0) return <span className="text-slate-300">—</span>;

  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {fields.map((field) => (
        <span key={field.label} className="text-xs">
          <span className="text-slate-400">{field.label}</span>{" "}
          {field.from !== undefined && field.to !== undefined ? (
            <>
              <s className="text-slate-400">{field.from}</s>{" "}
              <span className="font-medium text-slate-800">{field.to}</span>
            </>
          ) : (
            <span className="font-medium text-slate-800">{field.from ?? field.to}</span>
          )}
        </span>
      ))}
    </span>
  );
}
