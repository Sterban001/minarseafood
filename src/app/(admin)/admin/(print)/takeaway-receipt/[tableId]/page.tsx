import { redirect } from "next/navigation";

export default async function TakeawayReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ tableId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { tableId } = await params;
  const { date } = await searchParams;
  redirect(`/admin/table-receipt/${tableId}${date ? `?date=${encodeURIComponent(date)}` : ""}`);
}
