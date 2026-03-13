import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SfDashboardData } from "@/lib/server/sf-dashboard";

type SfDashboardViewProps = {
  data: SfDashboardData;
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function SfDashboardView({ data }: SfDashboardViewProps) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">Service Fusion Dashboard</h1>
        <p className="text-sm text-zinc-600">
          Live API data from {data.range.start} to {data.range.end}. Generated {new Date(data.generatedAt).toLocaleString()}.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Estimates" value={data.totals.estimates.toLocaleString()} />
        <MetricCard title="Accepted Estimates" value={data.totals.acceptedEstimates.toLocaleString()} />
        <MetricCard title="Acceptance Rate" value={`${data.totals.estimateAcceptanceRate}%`} />
        <MetricCard title="Jobs" value={data.totals.jobs.toLocaleString()} />
        <MetricCard title="Completed Jobs" value={data.totals.completedJobs.toLocaleString()} />
        <MetricCard title="Projected Revenue" value={usd.format(data.totals.projectedRevenue)} />
        <MetricCard title="Booked Revenue" value={usd.format(data.totals.bookedRevenue)} />
        <MetricCard
          title="Unattributed Revenue"
          value={usd.format(data.sourceRows.find((row) => row.source === "Unattributed")?.revenue ?? 0)}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Revenue by Source</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500">
                  <th className="px-2 py-2 font-medium">Source</th>
                  <th className="px-2 py-2 font-medium">Estimates</th>
                  <th className="px-2 py-2 font-medium">Jobs</th>
                  <th className="px-2 py-2 font-medium">Booked Revenue</th>
                  <th className="px-2 py-2 font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {data.sourceRows.map((row) => (
                  <tr key={row.source} className="border-b last:border-0">
                    <td className="px-2 py-2 font-medium text-zinc-800">{row.source}</td>
                    <td className="px-2 py-2">{row.estimates.toLocaleString()}</td>
                    <td className="px-2 py-2">{row.jobs.toLocaleString()}</td>
                    <td className="px-2 py-2">{usd.format(row.revenue)}</td>
                    <td className="px-2 py-2">{row.shareOfBookedRevenue}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Owner Performance</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500">
                  <th className="px-2 py-2 font-medium">Owner</th>
                  <th className="px-2 py-2 font-medium">Estimates</th>
                  <th className="px-2 py-2 font-medium">Jobs</th>
                  <th className="px-2 py-2 font-medium">Projected</th>
                  <th className="px-2 py-2 font-medium">Booked</th>
                </tr>
              </thead>
              <tbody>
                {data.ownerRows.map((row) => (
                  <tr key={row.owner} className="border-b last:border-0">
                    <td className="px-2 py-2 font-medium text-zinc-800">{row.owner}</td>
                    <td className="px-2 py-2">{row.estimates.toLocaleString()}</td>
                    <td className="px-2 py-2">{row.jobs.toLocaleString()}</td>
                    <td className="px-2 py-2">{usd.format(row.projectedRevenue)}</td>
                    <td className="px-2 py-2">{usd.format(row.bookedRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Top Customers by Booked Revenue</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500">
                  <th className="px-2 py-2 font-medium">Customer</th>
                  <th className="px-2 py-2 font-medium">Jobs</th>
                  <th className="px-2 py-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((row) => (
                  <tr key={row.customer} className="border-b last:border-0">
                    <td className="px-2 py-2 font-medium text-zinc-800">{row.customer}</td>
                    <td className="px-2 py-2">{row.jobs.toLocaleString()}</td>
                    <td className="px-2 py-2">{usd.format(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500">
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Customer</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Source</th>
                  <th className="px-2 py-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentJobs.map((row) => (
                  <tr key={`${row.id}-${row.date}`} className="border-b last:border-0">
                    <td className="px-2 py-2">{row.date || "-"}</td>
                    <td className="px-2 py-2 font-medium text-zinc-800">{row.customer}</td>
                    <td className="px-2 py-2">{row.status}</td>
                    <td className="px-2 py-2">{row.source}</td>
                    <td className="px-2 py-2">{usd.format(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
      <CardContent className="space-y-1 p-5">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
        <p className="text-3xl font-semibold text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}
