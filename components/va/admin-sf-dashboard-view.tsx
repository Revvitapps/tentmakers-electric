import Image from "next/image";

import type { SfDashboardData } from "@/lib/server/sf-dashboard";
import styles from "@/components/va/brand-dashboard.module.css";

type AdminSfDashboardViewProps = {
  data: SfDashboardData;
};

export function AdminSfDashboardView({ data }: AdminSfDashboardViewProps) {
  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.brand}>
          <Image
            src="/wordmark-pill-dark.png"
            alt="Tentmakers Electric"
            width={180}
            height={44}
            className={styles.logo}
            priority
          />
          <div>
            <h1 className={styles.title}>Operations Dashboard</h1>
            <p className={styles.subtitle}>Service Fusion live pipeline from {data.range.start} to {data.range.end}</p>
          </div>
        </div>
        <div className={styles.badges}>
          <span className={styles.badge}>No Manual Entry</span>
          <span className={styles.badge}>Updated {new Date(data.generatedAt).toLocaleString()}</span>
        </div>
      </section>

      <section className={styles.kpiGrid}>
        <Kpi label="Open Pipeline" value={String(data.openPipeline.length)} />
        <Kpi label="Open Jobs" value={String(data.totals.openJobs)} />
        <Kpi label="Open Estimates" value={String(data.totals.openEstimates)} />
        <Kpi label="Jobs (YTD)" value={String(data.totals.jobs)} />
        <Kpi label="Completed Jobs" value={String(data.totals.completedJobs)} />
        <Kpi label="Estimates (YTD)" value={String(data.totals.estimates)} />
        <Kpi label="Accepted Estimates" value={String(data.totals.acceptedEstimates)} />
        <Kpi label="Acceptance Rate" value={`${data.totals.estimateAcceptanceRate}%`} />
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Open Pipeline (Not Closed)</h2>
          <span className={styles.sectionMeta}>Includes both estimates and jobs</span>
        </header>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Source</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {data.openPipeline.map((row) => (
                <tr key={`${row.type}-${row.id}-${row.date}`}>
                  <td>
                    <span className={`${styles.typePill} ${row.type === "Estimate" ? styles.typeEstimate : styles.typeJob}`}>
                      {row.type}
                    </span>
                  </td>
                  <td>{row.date || "-"}</td>
                  <td>{row.customer}</td>
                  <td>{row.status}</td>
                  <td>{row.source}</td>
                  <td>{row.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <article className={styles.kpiCard}>
      <p className={styles.kpiLabel}>{label}</p>
      <p className={styles.kpiValue}>{value}</p>
    </article>
  );
}
