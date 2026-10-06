import type { Metadata } from "next";

import { PageHeader } from "@/modules/admin/components/admin-shell";
import { ExpensesDashboard, type ExpensesTabType } from "@/modules/admin/expenses/components/expenses-dashboard";
import { getDailyExpensesData, getRecentStaffNames } from "@/modules/admin/expenses/queries";
import { getActiveBusinessDay } from "@/modules/admin/sales/queries";
import { isValidIsoDate, todayBusinessDate } from "@/shared/lib/dates";

export const metadata: Metadata = { title: "Expenses — Minar Sea Food" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const activeDay = await getActiveBusinessDay();
  const defaultDate = activeDay?.date ?? todayBusinessDate();

  const dateParam = typeof sp?.date === "string" ? sp.date : undefined;
  const date = dateParam && isValidIsoDate(dateParam) ? dateParam : defaultDate;

  const tabParam = typeof sp?.tab === "string" ? sp.tab : "salaries";
  const validTabs: ExpensesTabType[] = ["salaries", "items", "others"];
  const initialTab: ExpensesTabType = validTabs.includes(tabParam as ExpensesTabType)
    ? (tabParam as ExpensesTabType)
    : "salaries";

  const [data, recentStaff] = await Promise.all([
    getDailyExpensesData(date),
    getRecentStaffNames(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses & Salaries"
        subtitle="Daily staff wages · Itemized kitchen supplies · Miscellaneous petty cash"
      />

      <ExpensesDashboard
        data={data}
        activeDate={defaultDate}
        initialTab={initialTab}
        recentStaff={recentStaff}
      />
    </div>
  );
}
