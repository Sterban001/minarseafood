// This route handler was removed during the counter-sale refactor.
// CSV export of waiter / table / void reports is no longer needed.
// Kept as a stub so the route segment doesn't break the build.

export const dynamic = "force-dynamic";

export function GET() {
  return new Response("CSV exports are no longer available.\n", { status: 410 });
}
