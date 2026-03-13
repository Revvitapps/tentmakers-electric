import { requireRole } from "@/lib/server/auth";
import { AdminSfDashboardView } from "@/components/va/admin-sf-dashboard-view";
import { getSfDashboardData } from "@/lib/server/sf-dashboard";

export default async function AdminPage() {
  await requireRole("VA");
  const data = await getSfDashboardData();
  return <AdminSfDashboardView data={data} />;
}
