"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import type { SfDashboardData } from "@/lib/server/sf-dashboard";
import styles from "@/components/va/brand-dashboard.module.css";

type AdminSfDashboardViewProps = {
  data: SfDashboardData;
};

type VaBucketKey = "new" | "d2" | "d5" | "d10";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function AdminSfDashboardView({ data }: AdminSfDashboardViewProps) {
  const [bucket, setBucket] = useState<VaBucketKey>("new");

  const bucketConfig = useMemo(() => {
    if (bucket === "new") {
      return {
        title: "New Leads (0-1 Day)",
        subtitle: "Immediate first touch queue.",
        rows: data.va.newToday,
      };
    }
    if (bucket === "d2") {
      return {
        title: "Follow-up (Day 2-4)",
        subtitle: "Second touch + date lock priority.",
        rows: data.va.followUpDay2To4,
      };
    }
    if (bucket === "d5") {
      return {
        title: "Follow-up (Day 5-9)",
        subtitle: "Reframe value + close pressure window.",
        rows: data.va.followUpDay5To9,
      };
    }
    return {
      title: "Overdue Follow-up (Day 10+)",
      subtitle: "Breakup-style close or archive decision.",
      rows: data.va.followUpDay10Plus,
    };
  }, [bucket, data]);

  const closeGap = Math.max(0, data.va.targetCloseRate - data.va.currentCloseRate);

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
            <h1 className={styles.title}>VA Conversion Board</h1>
            <p className={styles.subtitle}>Live Service Fusion lead flow • optimized for daily follow-up execution</p>
          </div>
        </div>
        <div className={styles.badges}>
          <span className={styles.badge}>Target close rate: {data.va.targetCloseRate}%</span>
          <span className={styles.badge}>Current: {data.va.currentCloseRate}%</span>
          <span className={styles.badge}>Gap: {closeGap}%</span>
        </div>
      </section>

      <section className={styles.kpiGrid}>
        <DrillCard
          active={bucket === "new"}
          onClick={() => setBucket("new")}
          label="New Leads"
          value={String(data.va.newToday.length)}
          hint="Touch in under 10 minutes"
        />
        <DrillCard
          active={bucket === "d2"}
          onClick={() => setBucket("d2")}
          label="Follow-up Day 2-4"
          value={String(data.va.followUpDay2To4.length)}
          hint="Send options + ask for date"
        />
        <DrillCard
          active={bucket === "d5"}
          onClick={() => setBucket("d5")}
          label="Follow-up Day 5-9"
          value={String(data.va.followUpDay5To9.length)}
          hint="Reframe + urgency"
        />
        <DrillCard
          active={bucket === "d10"}
          onClick={() => setBucket("d10")}
          label="Overdue Day 10+"
          value={String(data.va.followUpDay10Plus.length)}
          hint="Close or archive today"
        />
        <Kpi label="Open Pipeline" value={String(data.openPipeline.length)} />
        <Kpi label="Open Jobs" value={String(data.totals.openJobs)} />
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{bucketConfig.title}</h2>
          <span className={styles.sectionMeta}>{bucketConfig.subtitle}</span>
        </header>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Days Open</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Source</th>
                <th>Owner</th>
                <th>Potential</th>
              </tr>
            </thead>
            <tbody>
              {bucketConfig.rows.map((row) => (
                <tr key={`${bucket}-${row.type}-${row.id}-${row.date}`}>
                  <td>
                    <span className={`${styles.typePill} ${row.type === "Estimate" ? styles.typeEstimate : styles.typeJob}`}>
                      {row.type}
                    </span>
                  </td>
                  <td>{row.daysOpen}</td>
                  <td>{row.date || "-"}</td>
                  <td>{row.customer}</td>
                  <td>{row.status}</td>
                  <td>{row.source}</td>
                  <td>{row.owner}</td>
                  <td className={styles.money}>{usd.format(row.amount)}</td>
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
