"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type KpiTotals = {
  leads: number;
  estimatesSent: number;
  depositsPaid: number;
  closeRate: number;
  averageResponseMinutes: number;
};

type KpiViewProps = {
  totals: KpiTotals;
  sourceRows: Array<{
    source: string;
    leads: number;
    estimates: number;
    deposits: number;
    closeRate: number;
  }>;
  stageRows: Array<{
    stage: string;
    count: number;
  }>;
};

const colors = ["#0f766e", "#0284c7", "#a16207", "#7c3aed", "#c2410c", "#be123c"];

export function KpisView({ totals, sourceRows, stageRows }: KpiViewProps) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">KPIs</h1>
        <p className="text-sm text-zinc-600">Close rate, source quality, and response-speed visibility.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Leads" value={totals.leads} />
        <MetricCard title="Estimates Sent" value={totals.estimatesSent} />
        <MetricCard title="Deposits Paid" value={totals.depositsPaid} />
        <MetricCard title="Close Rate" value={`${totals.closeRate}%`} />
        <MetricCard title="Avg First Response" value={`${totals.averageResponseMinutes} min`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Source Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceRows} margin={{ top: 10, right: 12, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e4e4e7" />
                <XAxis dataKey="source" tick={{ fontSize: 11 }} angle={-24} textAnchor="end" interval={0} height={70} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="leads" fill="#0284c7" radius={[8, 8, 0, 0]} />
                <Bar dataKey="deposits" fill="#0f766e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Pipeline Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stageRows} dataKey="count" nameKey="stage" cx="50%" cy="50%" outerRadius={120} label>
                  {stageRows.map((row, index) => (
                    <Cell key={row.stage} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">By Source Detail</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500">
                  <th className="px-2 py-2 font-medium">Source</th>
                  <th className="px-2 py-2 font-medium">Leads</th>
                  <th className="px-2 py-2 font-medium">Estimates</th>
                  <th className="px-2 py-2 font-medium">Deposits</th>
                  <th className="px-2 py-2 font-medium">Close Rate</th>
                </tr>
              </thead>
              <tbody>
                {sourceRows.map((row) => (
                  <tr key={row.source} className="border-b last:border-0">
                    <td className="px-2 py-2 font-medium text-zinc-800">{row.source}</td>
                    <td className="px-2 py-2">{row.leads}</td>
                    <td className="px-2 py-2">{row.estimates}</td>
                    <td className="px-2 py-2">{row.deposits}</td>
                    <td className="px-2 py-2">{row.closeRate}%</td>
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

function MetricCard({ title, value }: { title: string; value: number | string }) {
  return (
    <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
      <CardContent className="space-y-1 p-5">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
        <p className="text-3xl font-semibold text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}
