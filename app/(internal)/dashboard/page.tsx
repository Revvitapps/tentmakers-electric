import { DashboardView } from "@/components/va/dashboard-view";
import { getDashboardData } from "@/lib/server/queries";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return <DashboardView {...data} />;
}
