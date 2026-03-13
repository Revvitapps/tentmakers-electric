import { KpisView } from "@/components/va/kpis-view";
import { getKpiData } from "@/lib/server/queries";

export default async function KpisPage() {
  const data = (await getKpiData()) as any;

  return (
    <KpisView
      totals={{
        leads: Number(data?.totals?.leads ?? 0),
        estimatesSent: Number(data?.totals?.estimatesSent ?? 0),
        depositsPaid: Number(data?.totals?.depositsPaid ?? 0),
        closeRate: Number(data?.totals?.closeRate ?? 0),
        averageResponseMinutes: Number(data?.totals?.averageResponseMinutes ?? 0),
      }}
      sourceRows={(data?.sourceRows ?? []).map((row: any) => ({
        source: String(row?.source ?? "Unknown"),
        leads: Number(row?.leads ?? 0),
        estimates: Number(row?.estimates ?? 0),
        deposits: Number(row?.deposits ?? 0),
        closeRate: Number(row?.closeRate ?? 0),
      }))}
      stageRows={(data?.stageRows ?? []).map((row: any) => ({
        stage: String(row?.stage ?? "Unknown"),
        count: Number(row?.count ?? 0),
      }))}
    />
  );
}
