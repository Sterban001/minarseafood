import { createServerSupabase } from "@/shared/supabase/server";
import type { Expense } from "@/shared/types/database";

import type { DailyExpensesData } from "./types";

/**
 * Fetches all expenses for a specific business date, separated by tab type,
 * along with daily sales revenue to compute net daily profit / cashflow.
 */
export async function getDailyExpensesData(date: string): Promise<DailyExpensesData> {
  const supabase = await createServerSupabase();

  const [expensesRes, salesRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("business_date", date)
      .order("created_at", { ascending: false }),
    supabase
      .from("sales")
      .select("total")
      .eq("business_date", date),
  ]);

  const expenses: Expense[] = (expensesRes.data as Expense[]) ?? [];
  const sales = salesRes.data ?? [];

  const salaries = expenses.filter((e) => e.expense_type === "salary");
  const items = expenses.filter((e) => e.expense_type === "daily_item");
  const others = expenses.filter((e) => e.expense_type === "miscellaneous");

  const salariesTotal = salaries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const itemsTotal = items.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const othersTotal = others.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const grandTotal = salariesTotal + itemsTotal + othersTotal;

  const salesTotal = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const netProfit = salesTotal - grandTotal;

  return {
    date,
    salaries,
    items,
    others,
    totals: {
      salariesTotal,
      itemsTotal,
      othersTotal,
      grandTotal,
      salariesCount: salaries.length,
      itemsCount: items.length,
      othersCount: others.length,
    },
    salesTotal,
    netProfit,
  };
}

/**
 * Returns distinct staff names recently entered in salaries for quick autocomplete.
 */
export async function getRecentStaffNames(): Promise<string[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("expenses")
      .select("staff_name")
      .eq("expense_type", "salary")
      .not("staff_name", "is", null)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!data) return [];
    const set = new Set<string>();
    for (const row of data) {
      if (row.staff_name && row.staff_name.trim()) {
        set.add(row.staff_name.trim());
      }
    }
    return Array.from(set).slice(0, 8);
  } catch {
    return [];
  }
}
