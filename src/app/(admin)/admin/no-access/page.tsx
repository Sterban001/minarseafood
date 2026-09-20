import type { Metadata } from "next";

import { signOut } from "@/modules/admin/auth/actions";
import { lookupStaff, roleLabels } from "@/modules/admin/auth/session";
import type { AppRole } from "@/shared/types/database";
import { Button, ButtonLink } from "@/shared/ui/button";

export const metadata: Metadata = { title: "No access" };

export default async function NoAccessPage({ searchParams }: PageProps<"/admin/no-access">) {
  const params = await searchParams;
  const needed = typeof params.need === "string" ? params.need.split(",") : [];
  const staff = await lookupStaff();

  const { heading, body } = explain(staff.state, needed);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{heading}</h1>
        <p className="mt-2 text-sm text-slate-600">{body}</p>

        {staff.state === "ok" ? (
          <p className="mt-4 text-xs text-slate-500">
            Signed in as {staff.session.profile.full_name} (
            {roleLabels[staff.session.profile.role]}).
          </p>
        ) : null}

        <div className="mt-6 flex justify-center gap-2">
          {staff.state === "ok" ? (
            <ButtonLink href="/admin" variant="secondary">
              Back to my screen
            </ButtonLink>
          ) : null}
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

function explain(state: string, needed: string[]) {
  if (state === "deactivated") {
    return {
      heading: "This account is switched off",
      body: "A manager has deactivated this login. Your past sales are still recorded — ask them to switch it back on.",
    };
  }

  if (state === "no-profile") {
    return {
      heading: "No staff profile yet",
      body: "This login exists but has not been set up as staff. A manager needs to add you from the Staff screen.",
    };
  }

  const roles = needed
    .filter((role): role is AppRole => role in roleLabels)
    .map((role) => roleLabels[role]);

  return {
    heading: "Not your screen",
    body: roles.length
      ? `That page is for ${roles.join(" or ")} only.`
      : "You do not have access to that page.",
  };
}
