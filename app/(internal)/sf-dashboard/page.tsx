import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SfDashboardView } from "@/components/va/sf-dashboard-view";
import { requireRole } from "@/lib/server/auth";
import { getSfDashboardData } from "@/lib/server/sf-dashboard";

export const dynamic = "force-dynamic";

export default async function SfDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  await requireRole("Joe");
  const params = await searchParams;

  try {
    const data = await getSfDashboardData({
      start: params.start,
      end: params.end,
    });

    return <SfDashboardView data={data} />;
  } catch (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">Service Fusion Dashboard</h1>
        <Alert className="border-rose-200 bg-rose-50 text-rose-900">
          <AlertTitle>Unable to load Service Fusion data.</AlertTitle>
          <AlertDescription>{error instanceof Error ? error.message : "Unknown error"}</AlertDescription>
        </Alert>
      </div>
    );
  }
}
