import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, Pencil, Power, ShieldCheck, UserPlus } from "lucide-react";

import { ActionForm } from "@/modules/admin/components/action-form";
import { PageHeader } from "@/modules/admin/components/admin-shell";
import { Popover } from "@/modules/admin/components/popover";
import { requireManager, roleBlurbs, roleLabels } from "@/modules/admin/auth/session";
import {
  changeRole,
  createStaff,
  resetPassword,
  setStaffActive,
  updateStaff,
} from "@/modules/admin/staff/actions";
import { createServerSupabase } from "@/shared/supabase/server";
import { hasServiceRoleKey } from "@/shared/supabase/admin";
import { todayBusinessDate } from "@/shared/lib/dates";
import { formatMoney, toNumber } from "@/shared/lib/money";
import type { AppRole, Profile } from "@/shared/types/database";
import { Field, FormMessage, Input, Select } from "@/shared/ui/form";
import { SubmitButton } from "@/shared/ui/submit-button";
import { Badge, Card, CardHeader } from "@/shared/ui/surface";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const me = await requireManager();
  const supabase = await createServerSupabase();
  const today = todayBusinessDate();

  const [profilesResult, todayResult] = await Promise.all([
    supabase.from("profiles").select("*").order("role").order("full_name"),
    supabase
      .from("v_sales_by_waiter")
      .select("waiter_id, orders_count, net_sales")
      .eq("business_date", today),
  ]);

  if (profilesResult.error) throw new Error(profilesResult.error.message);

  const staff = profilesResult.data ?? [];
  const todayByWaiter = new Map(
    (todayResult.data ?? []).map((row) => [
      row.waiter_id,
      { orders: row.orders_count, sales: toNumber(row.net_sales) },
    ]),
  );

  const isSuperAdmin = me.profile.role === "super_admin";
  const grouped: [AppRole, Profile[]][] = (
    ["super_admin", "manager", "waiter"] as AppRole[]
  ).map((role) => [role, staff.filter((person) => person.role === role)]);

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle={`${staff.filter((person) => person.is_active).length} active logins · every order is stamped with the waiter who punched it`}
        actions={
          <Popover
            label={
              <>
                <UserPlus className="size-4" aria-hidden />
                Add staff
              </>
            }
            variant="primary"
            size="md"
            width="w-80"
          >
            <NewStaffForm isSuperAdmin={isSuperAdmin} />
          </Popover>
        }
      />

      {hasServiceRoleKey() ? null : (
        <div className="mb-4">
          <FormMessage status="info">
            Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to <code>.env.local</code> to create
            logins and reset passwords from here. Everything else on this page works
            without it.
          </FormMessage>
        </div>
      )}

      <div className="space-y-4">
        {grouped.map(([role, people]) =>
          people.length === 0 ? null : (
            <Card key={role}>
              <CardHeader title={roleLabels[role]} subtitle={roleBlurbs[role]} />
              <ul className="divide-y divide-slate-200">
                {people.map((person) => {
                  const stats = todayByWaiter.get(person.id);
                  return (
                    <li
                      key={person.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {person.full_name}
                          </span>
                          {person.id === me.userId ? (
                            <Badge tone="brand">You</Badge>
                          ) : null}
                          {person.is_active ? null : (
                            <Badge tone="danger">Switched off</Badge>
                          )}
                        </span>
                        {person.phone ? (
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {person.phone}
                          </span>
                        ) : null}
                      </span>

                      <span className="text-xs text-slate-500">
                        {stats
                          ? `Today: ${stats.orders} bills · ${formatMoney(stats.sales)}`
                          : "No sales today"}
                      </span>

                      <Link
                        href={`/admin/reports/waiters/${person.id}`}
                        className="text-xs font-medium text-brand-700 hover:text-brand-900"
                      >
                        Sales history
                      </Link>

                      <span className="flex gap-1.5">
                        <Popover
                          label={<Pencil className="size-3.5" aria-hidden />}
                          variant="ghost"
                          width="w-72"
                        >
                          <ActionForm
                            action={updateStaff}
                            announceSuccess
                            className="space-y-3"
                          >
                            <input type="hidden" name="id" value={person.id} />
                            <Field label="Name" htmlFor={`name-${person.id}`} required>
                              <Input
                                id={`name-${person.id}`}
                                name="fullName"
                                defaultValue={person.full_name}
                                required
                              />
                            </Field>
                            <Field label="Phone" htmlFor={`phone-${person.id}`}>
                              <Input
                                id={`phone-${person.id}`}
                                name="phone"
                                type="tel"
                                defaultValue={person.phone ?? ""}
                              />
                            </Field>
                            <SubmitButton size="sm" className="w-full">
                              Save
                            </SubmitButton>
                          </ActionForm>
                        </Popover>

                        {isSuperAdmin ? (
                          <Popover
                            label={<ShieldCheck className="size-3.5" aria-hidden />}
                            variant="ghost"
                            width="w-72"
                          >
                            <ActionForm
                              action={changeRole}
                              announceSuccess
                              className="space-y-3"
                            >
                              <input type="hidden" name="id" value={person.id} />
                              <Field
                                label="Role"
                                htmlFor={`role-${person.id}`}
                                hint="Role changes are written to the audit trail."
                              >
                                <Select
                                  id={`role-${person.id}`}
                                  name="role"
                                  defaultValue={person.role}
                                >
                                  <option value="waiter">Waiter</option>
                                  <option value="manager">Manager</option>
                                  <option value="super_admin">Super Admin</option>
                                </Select>
                              </Field>
                              <SubmitButton size="sm" className="w-full">
                                Update role
                              </SubmitButton>
                            </ActionForm>
                          </Popover>
                        ) : null}

                        <Popover
                          label={<KeyRound className="size-3.5" aria-hidden />}
                          variant="ghost"
                          width="w-72"
                        >
                          <ActionForm
                            action={resetPassword}
                            announceSuccess
                            className="space-y-3"
                          >
                            <input type="hidden" name="id" value={person.id} />
                            <Field
                              label="New password"
                              htmlFor={`pw-${person.id}`}
                              hint="At least 8 characters. There is no email reset — hand it over in person."
                              required
                            >
                              <Input
                                id={`pw-${person.id}`}
                                name="password"
                                type="text"
                                minLength={8}
                                autoComplete="off"
                                required
                              />
                            </Field>
                            <SubmitButton size="sm" className="w-full">
                              Set password
                            </SubmitButton>
                          </ActionForm>
                        </Popover>

                        <ActionForm action={setStaffActive}>
                          <input type="hidden" name="id" value={person.id} />
                          <input
                            type="hidden"
                            name="active"
                            value={person.is_active ? "false" : "true"}
                          />
                          <SubmitButton
                            variant="ghost"
                            size="sm"
                            className="px-2"
                            aria-label={
                              person.is_active ? "Switch this login off" : "Switch it on"
                            }
                            pendingLabel="…"
                          >
                            <Power
                              className={
                                person.is_active
                                  ? "size-3.5 text-emerald-600"
                                  : "size-3.5 text-slate-400"
                              }
                              aria-hidden
                            />
                          </SubmitButton>
                        </ActionForm>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ),
        )}
      </div>
    </>
  );
}

function NewStaffForm({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  return (
    <ActionForm action={createStaff} announceSuccess className="space-y-3">
      <Field label="Name" htmlFor="new-name" required>
        <Input id="new-name" name="fullName" placeholder="Rahul K." required minLength={2} />
      </Field>

      <Field
        label="Email"
        htmlFor="new-email"
        hint="This is their username. It never needs to be a real inbox."
        required
      >
        <Input
          id="new-email"
          name="email"
          type="email"
          placeholder="rahul@minarseafood.com"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </Field>

      <Field label="Phone" htmlFor="new-phone">
        <Input id="new-phone" name="phone" type="tel" placeholder="Optional" />
      </Field>

      <Field
        label="Password"
        htmlFor="new-password"
        hint="At least 8 characters. Give it to them directly."
        required
      >
        <Input
          id="new-password"
          name="password"
          type="text"
          minLength={8}
          autoComplete="off"
          required
        />
      </Field>

      <Field label="Role" htmlFor="new-role" required>
        <Select id="new-role" name="role" defaultValue="waiter">
          <option value="waiter">Waiter — own tables only</option>
          {isSuperAdmin ? (
            <>
              <option value="manager">Manager — floor, voids, menu, staff</option>
              <option value="super_admin">Super Admin — everything</option>
            </>
          ) : null}
        </Select>
      </Field>

      <SubmitButton size="md" className="w-full" pendingLabel="Creating…">
        Create login
      </SubmitButton>
    </ActionForm>
  );
}
