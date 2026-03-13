"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import type { SfDashboardData } from "@/lib/server/sf-dashboard";
import styles from "@/components/va/brand-dashboard.module.css";

type AdminSfDashboardViewProps = {
  data: SfDashboardData;
};

type VaBucketKey = "new" | "d2" | "d5" | "d10";
type SaveState = "idle" | "saving" | "saved" | "error";
type RowDraft = {
  followUpDate: string;
  callOutcome: string;
  callNote: string;
  state: SaveState;
  message: string;
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function upperName(value: string) {
  return (value || "").toUpperCase();
}

export function AdminSfDashboardView({ data }: AdminSfDashboardViewProps) {
  const [bucket, setBucket] = useState<VaBucketKey | null>(null);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});

  const bucketConfig = useMemo(() => {
    if (bucket === null || bucket === "new") {
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

  function rowKey(type: "Estimate" | "Job", id: string) {
    return `${type}-${id}`;
  }

  function getDraft(key: string): RowDraft {
    return (
      drafts[key] ?? {
        followUpDate: "",
        callOutcome: "",
        callNote: "",
        state: "idle",
        message: "",
      }
    );
  }

  function updateDraft(key: string, patch: Partial<RowDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {
          followUpDate: "",
          callOutcome: "",
          callNote: "",
          state: "idle" as const,
          message: "",
        }),
        ...patch,
      },
    }));
  }

  async function pushToSf(type: "Estimate" | "Job", id: string) {
    const key = rowKey(type, id);
    const draft = getDraft(key);
    updateDraft(key, { state: "saving", message: "" });

    try {
      const response = await fetch("/api/sf/workspace-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordType: type,
          recordId: id,
          followUpDate: draft.followUpDate || undefined,
          callOutcome: draft.callOutcome || undefined,
          callNote: draft.callNote || undefined,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; taskIds?: Array<string | number> };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to sync with Service Fusion");
      }

      const count = Array.isArray(payload.taskIds) ? payload.taskIds.length : 0;
      updateDraft(key, {
        state: "saved",
        message: count > 0 ? `Synced (${count} task${count === 1 ? "" : "s"})` : "Synced",
      });
    } catch (error) {
      updateDraft(key, {
        state: "error",
        message: error instanceof Error ? error.message : "Sync failed",
      });
    }
  }

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
            <h1 className={styles.title}>Angel&apos;s Workspace</h1>
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

      {!bucket ? (
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Pick a Queue to Drill Down</h2>
            <span className={styles.sectionMeta}>Use the four follow-up cards above to load individual lead rows.</span>
          </header>
        </section>
      ) : null}

      {bucket ? (
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
                <th>Workspace Sync</th>
              </tr>
            </thead>
            <tbody>
              {bucketConfig.rows.map((row) => {
                const key = rowKey(row.type, row.id);
                const draft = getDraft(key);
                return (
                <tr key={`${bucket}-${row.type}-${row.id}-${row.date}`}>
                  <td>
                    <span className={`${styles.typePill} ${row.type === "Estimate" ? styles.typeEstimate : styles.typeJob}`}>
                      {row.type}
                    </span>
                  </td>
                  <td>{row.daysOpen}</td>
                  <td>{row.date || "-"}</td>
                  <td>{upperName(row.customer)}</td>
                  <td>{row.status}</td>
                  <td>{row.source}</td>
                  <td>{upperName(row.owner)}</td>
                  <td className={styles.money}>{usd.format(row.amount)}</td>
                  <td>
                    <div className={styles.syncStack}>
                      <div className={styles.syncRow}>
                        <label className={styles.srOnly} htmlFor={`follow-up-${key}`}>Follow-up date</label>
                        <input
                          id={`follow-up-${key}`}
                          type="date"
                          value={draft.followUpDate}
                          onChange={(event) => updateDraft(key, { followUpDate: event.target.value, state: "idle", message: "" })}
                          className={styles.syncInput}
                        />
                        <label className={styles.srOnly} htmlFor={`outcome-${key}`}>Call outcome</label>
                        <select
                          id={`outcome-${key}`}
                          value={draft.callOutcome}
                          onChange={(event) => updateDraft(key, { callOutcome: event.target.value, state: "idle", message: "" })}
                          className={styles.syncSelect}
                        >
                          <option value="">Outcome</option>
                          <option value="No answer">No answer</option>
                          <option value="Spoke - follow-up">Spoke - follow-up</option>
                          <option value="Estimate sent">Estimate sent</option>
                          <option value="Scheduled">Scheduled</option>
                          <option value="Not interested">Not interested</option>
                        </select>
                      </div>
                      <div className={styles.syncRow}>
                        <label className={styles.srOnly} htmlFor={`note-${key}`}>Call note</label>
                        <input
                          id={`note-${key}`}
                          type="text"
                          placeholder="Call note"
                          value={draft.callNote}
                          onChange={(event) => updateDraft(key, { callNote: event.target.value, state: "idle", message: "" })}
                          className={styles.syncInput}
                        />
                        <button
                          type="button"
                          onClick={() => pushToSf(row.type, row.id)}
                          disabled={draft.state === "saving"}
                          className={styles.syncButton}
                        >
                          {draft.state === "saving" ? "Sending..." : "Send"}
                        </button>
                      </div>
                      {draft.message ? (
                        <p className={draft.state === "error" ? styles.syncError : styles.syncOk}>{draft.message}</p>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}
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
