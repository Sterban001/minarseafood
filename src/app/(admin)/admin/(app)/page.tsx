import type { Metadata } from "next";

import { QuickSaleView } from "@/modules/admin/sales/components/quick-sale-view";
import {
  getActiveBusinessDay,
  getDiningTables,
  getLiveTablesStatus,
  getMenuForSale,
} from "@/modules/admin/sales/queries";
import { EmptyState } from "@/shared/ui/surface";

export const metadata: Metadata = { title: "Sale — Minar Sea Food" };

/** /admin is now the Quick Sale screen: punch items → charge cash → print receipt. */
export default async function QuickSalePage() {
  const [categories, tables, liveTables, activeDay] = await Promise.all([
    getMenuForSale(),
    getDiningTables(),
    getLiveTablesStatus(),
    getActiveBusinessDay(),
  ]);

  if (!categories.length) {
    return (
      <EmptyState
        title="No menu items available"
        description="Add categories and dishes in the Menu page first."
      />
    );
  }

  return (
    <QuickSaleView
      categories={categories}
      tables={tables}
      liveTables={liveTables}
      activeDay={activeDay}
    />
  );
}


