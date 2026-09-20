import { redirect } from "next/navigation";

import { homeForRole, requireStaff } from "@/modules/admin/auth/session";

/** /admin is just a signpost: waiters go to the floor, managers to the numbers. */
export default async function AdminIndexPage() {
  const { profile } = await requireStaff();
  redirect(homeForRole(profile.role));
}
