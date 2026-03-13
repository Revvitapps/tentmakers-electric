import { requireRole } from "@/lib/server/auth";
import { SfDashboardView } from "@/components/va/sf-dashboard-view";
import { getSfDashboardData } from "@/lib/server/sf-dashboard";

export default async function OwnerPage() {
  await requireRole("Joe");
  const data = await getSfDashboardData();
  return <SfDashboardView data={data} />;
}
