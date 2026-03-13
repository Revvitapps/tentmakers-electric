"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import type { SfDashboardData } from "@/lib/server/sf-dashboard";
import styles from "@/components/va/brand-dashboard.module.css";

type SfDashboardViewProps = {
  data: SfDashboardData;
};

type DrillKey = "prospects" | "paid" | "outstanding";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function SfDashboardView({ data }: SfDashboardViewProps) {
  const [drill, setDrill] = useState<DrillKey>("prospects");

  const drillConfig = useMemo(() => {
    if (drill === "prospects") {
      return {
        title: "Prospects (Leads This Year)",
        subtitle: "From Service Fusion estimates and incoming opportunities.",
        headers: ["Contact Date", "Customer", "Source", "Status", "Owner", "Potential"],
        rows: data.cro.prospects.rows.map((row) => [
          row.contactDate || "-",
          row.customer,
          row.source,
          row.status,
          row.owner,
          usd.format(row.potentialValue),
        ]),
      };
    }

    if (drill === "paid") {
      return {
        title: "Closed / Paid Jobs",
        subtitle: "Jobs paid in full or marked paid/invoiced/closed.",
        headers: ["Start", "Completed", "Paid", "Customer", "Source", "Status", "Paid Amount"],
        rows: data.cro.paidJobs.rows.map((row) => [
          row.startDate || "-",
          row.completedDate || "-",
          row.paidDate || "-",
          row.customer,
          row.source,
          row.status,
          usd.format(row.amountPaid),
        ]),
      };
    }

    return {
      title: "Outstanding Receivables",
      subtitle: "Customers who still owe money and open amount due.",
      headers: ["Due Date", "Start", "Customer", "Source", "Status", "Amount Due"],
      rows: data.cro.outstanding.rows.map((row) => [
        row.dueDate || "-",
        row.startDate || "-",
        row.customer,
        row.source,
        row.status,
        usd.format(row.amountDue),
      ]),
    };
  }, [data, drill]);

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
            <h1 className={styles.title}>Master CRO Owner Board</h1>
            <p className={styles.subtitle}>Service Fusion live data • {data.range.start} to {data.range.end}</p>
          </div>
        </div>
        <div className={styles.badges}>
          <span className={styles.badge}>Auto Synced from SF</span>
          <span className={styles.badge}>Updated {new Date(data.generatedAt).toLocaleString()}</span>
        </div>
      </section>

      <section className={styles.kpiGrid}>
        <DrillCard
          active={drill === "prospects"}
          onClick={() => setDrill("prospects")}
          label="Leads / Prospects"
          value={data.cro.prospects.count.toLocaleString()}
          hint={`Potential ${usd.format(data.cro.prospects.potentialRevenue)}`}
        />
        <DrillCard
          active={drill === "paid"}
          onClick={() => setDrill("paid")}
          label="Closed / Paid Jobs"
          value={data.cro.paidJobs.count.toLocaleString()}
          hint={`Paid ${usd.format(data.cro.paidJobs.paidRevenue)}`}
        />
        <DrillCard
          active={drill === "outstanding"}
          onClick={() => setDrill("outstanding")}
          label="Outstanding Payments"
          value={data.cro.outstanding.count.toLocaleString()}
          hint={`Due ${usd.format(data.cro.outstanding.amountDue)}`}
        />
        <Kpi label="Open Jobs" value={String(data.totals.openJobs)} />
        <Kpi label="Open Estimates" value={String(data.totals.openEstimates)} />
        <Kpi label="Acceptance Rate" value={`${data.totals.estimateAcceptanceRate}%`} />
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{drillConfig.title}</h2>
          <span className={styles.sectionMeta}>{drillConfig.subtitle}</span>
        </header>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {drillConfig.headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drillConfig.rows.map((row, idx) => (
                <tr key={`${drill}-${idx}`}>
                  {row.map((cell, cellIdx) => (
                    <td key={`${drill}-${idx}-${cellIdx}`} className={cellIdx === row.length - 1 ? styles.money : undefined}>
                      {cell}
                    </td>
                  ))}
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

function DrillCard({
  label,
  value,
  hint,
  active,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`${styles.kpiCard} ${styles.drillCard} ${active ? styles.drillActive : ""}`} onClick={onClick}>
      <p className={styles.kpiLabel}>{label}</p>
      <p className={styles.kpiValue}>{value}</p>
      <p className={styles.kpiHint}>{hint}</p>
    </button>
  );
}
