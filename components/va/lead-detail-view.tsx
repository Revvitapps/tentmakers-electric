"use client";

import Link from "next/link";
import { type ReactNode, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  addLeadNoteAction,
  closeLeadAction,
  completeFollowUpTaskAction,
  escalateLeadAction,
  markDepositPaidAction,
  markEstimateSentAction,
  scheduleAppointmentAction,
  setFollowUpAction,
  toggleRequiredStopAction,
  updateLeadAction,
} from "@/app/actions/leads";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { APPT_STATUSES, DEPOSIT_STATUSES, FOLLOW_UP_PRESETS, LEAD_OUTCOMES, LEAD_STAGES } from "@/lib/constants";
import { calculateRequiredStopsScore, followUpLockMissing, getSopHealthLabel, hasEstimateCloseGap } from "@/lib/sop";
import type { Estimate, FollowUpTask, LeadActivity, LeadWithStops, ScriptTemplate } from "@/lib/types";

type LeadDetailViewProps = {
  lead: LeadWithStops & { estimate: Estimate | null };
  activities: (LeadActivity & {
    actor_profile?: {
      id: string;
      full_name: string;
      role: "VA" | "Joe";
    } | null;
  })[];
  scripts: ScriptTemplate[];
  followUps: FollowUpTask[];
};

const requiredStopFields = [
  { key: "scope_confirmed", label: "Scope confirmed" },
  { key: "timeline_asked", label: "Timeline asked" },
  { key: "decision_maker_asked", label: "Decision maker asked" },
  { key: "photos_received", label: "Photos received" },
  { key: "estimate_sent", label: "Estimate sent" },
  { key: "option_recommended", label: "Option recommended" },
  { key: "dates_offered", label: "Two date options offered" },
  { key: "deposit_asked", label: "Deposit asked" },
  { key: "followup_locked", label: "Follow-up locked" },
  { key: "documented_in_service_fusion", label: "Documented in Service Fusion" },
] as const;

function healthClass(score: number) {
  const label = getSopHealthLabel(score);

  if (label === "Green") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (label === "Yellow") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function formatLocalDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function LeadDetailView({ lead, activities, scripts, followUps }: LeadDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [customFollowUp, setCustomFollowUp] = useState("");
  const [note, setNote] = useState("");
  const [scriptName, setScriptName] = useState(lead.name);
  const [scriptDay, setScriptDay] = useState("Thursday");
  const [scriptTimeWindow, setScriptTimeWindow] = useState("Afternoon");
  const [depositLink, setDepositLink] = useState(lead.estimate?.deposit_link || "[DepositLink]");

  const sopScore = calculateRequiredStopsScore(lead.required_stops);
  const estimateGap = hasEstimateCloseGap(lead.required_stops);
  const missingFollowUp = followUpLockMissing(lead.stage, lead.next_touch_at);

  const orderedScripts = useMemo(
    () => [...scripts].sort((a, b) => Number(b.is_system) - Number(a.is_system) || a.title.localeCompare(b.title)),
    [scripts]
  );

  function refreshWithSuccess(message: string) {
    toast.success(message);
    router.refresh();
  }

  function runAction(task: () => Promise<{ ok: boolean; message: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await task();

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      refreshWithSuccess(successMessage);
    });
  }

  function fillTemplate(body: string) {
    return body
      .replace(/\[Name\]/g, scriptName || lead.name)
      .replace(/\[Day\]/g, scriptDay)
      .replace(/\[Morning\/Afternoon\]/g, scriptTimeWindow)
      .replace(/\[DepositLink\]/g, depositLink || "deposit link");
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <Link href="/dashboard">
              Back to dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">{lead.name}</h1>
          <p className="text-sm text-zinc-600">{lead.address}</p>
          <p className="text-xs text-zinc-500">
            Last touch: {formatLocalDateTime(lead.last_touch_at)} | Next touch: {formatLocalDateTime(lead.next_touch_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={`rounded-full border px-3 py-1 ${healthClass(sopScore)}`}>SOP Score: {sopScore}%</Badge>
          <Badge variant="outline" className="rounded-full border-zinc-300 px-3 py-1">
            {lead.stage}
          </Badge>
          {lead.escalation_flag ? (
            <Badge className="rounded-full bg-rose-600 px-3 py-1 text-white">Escalated</Badge>
          ) : null}
        </div>
      </section>

      {estimateGap ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTitle>Estimate sent without close steps.</AlertTitle>
          <AlertDescription>Option recommendation, two date options, and deposit ask must all be completed.</AlertDescription>
        </Alert>
      ) : null}

      {missingFollowUp ? (
        <Alert className="border-rose-200 bg-rose-50 text-rose-900">
          <AlertTitle>Follow-up not locked.</AlertTitle>
          <AlertDescription>
            This lead is in <strong>{lead.stage}</strong>. Lock a follow-up date now to prevent a floating lead.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Lead Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Stage">
                <Select
                  defaultValue={lead.stage}
                  onValueChange={(value) => runAction(async () => updateLeadAction({ leadId: lead.id, stage: value }), "Stage updated.")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Deposit status">
                <Select
                  defaultValue={lead.deposit_status}
                  onValueChange={(value) =>
                    runAction(async () => updateLeadAction({ leadId: lead.id, depositStatus: value }), "Deposit status updated.")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPOSIT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Appointment status">
                <Select
                  defaultValue={lead.appt_status}
                  onValueChange={(value) => runAction(async () => updateLeadAction({ leadId: lead.id, apptStatus: value }), "Appointment status updated.")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() => runAction(async () => markEstimateSentAction({ leadId: lead.id }), "Estimate marked sent.")}
              >
                Mark estimate sent
              </Button>

              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() =>
                  runAction(async () => {
                    const first = await toggleRequiredStopAction({ leadId: lead.id, key: "option_recommended", value: true });
                    if (!first.ok) return first;

                    const second = await toggleRequiredStopAction({ leadId: lead.id, key: "dates_offered", value: true });
                    if (!second.ok) return second;

                    return toggleRequiredStopAction({ leadId: lead.id, key: "deposit_asked", value: true });
                  }, "Estimate close steps completed.")
                }
              >
                Offer dates + deposit ask
              </Button>

              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    async () => updateLeadAction({ leadId: lead.id, depositStatus: "Requested", lastTouchAt: new Date().toISOString() }),
                    "Deposit marked requested."
                  )
                }
              >
                Deposit requested
              </Button>

              <Button disabled={isPending} onClick={() => runAction(async () => markDepositPaidAction({ leadId: lead.id }), "Deposit paid.")}>
                Deposit paid
              </Button>

              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() => runAction(async () => scheduleAppointmentAction({ leadId: lead.id }), "Appointment scheduled.")}
              >
                Schedule appointment
              </Button>

              <Button
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  runAction(async () => closeLeadAction({ leadId: lead.id, outcome: "Explicit No" }), "Lead closed with explicit no.")
                }
              >
                Close explicit no
              </Button>

              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => runAction(async () => escalateLeadAction({ leadId: lead.id }), "Escalated to owner.")}
              >
                Escalate to owner
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Required Stops</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requiredStopFields.map((field) => (
              <label key={field.key} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                <Checkbox
                  checked={Boolean(lead.required_stops?.[field.key])}
                  onCheckedChange={(checked) =>
                    runAction(
                      async () =>
                        toggleRequiredStopAction({
                          leadId: lead.id,
                          key: field.key,
                          value: checked === true,
                        }),
                      `${field.label} updated.`
                    )
                  }
                />
                {field.label}
              </label>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Follow-up Lock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-600">Never leave the thread without a locked date/time.</p>

            <div className="flex flex-wrap gap-2">
              {FOLLOW_UP_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      async () =>
                        setFollowUpAction({
                          leadId: lead.id,
                          dueAt: addDaysIso(preset.days),
                          type: preset.type,
                        }),
                      `${preset.label} follow-up locked.`
                    )
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-follow-up">Custom date/time</Label>
              <Input
                id="custom-follow-up"
                type="datetime-local"
                value={customFollowUp}
                onChange={(event) => setCustomFollowUp(event.target.value)}
              />
              <Button
                size="sm"
                disabled={isPending || !customFollowUp}
                onClick={() =>
                  runAction(
                    async () =>
                      setFollowUpAction({
                        leadId: lead.id,
                        dueAt: new Date(customFollowUp).toISOString(),
                        type: "Custom",
                      }),
                    "Custom follow-up locked."
                  )
                }
              >
                Lock follow-up
              </Button>
            </div>

            <div className="rounded-2xl bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
              Suggested phrasing: &quot;I will check back [Day] [Morning/Afternoon].&quot;
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Script Library (Copy in 1 click)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              <Field label="Name">
                <Input value={scriptName} onChange={(event) => setScriptName(event.target.value)} />
              </Field>
              <Field label="Day">
                <Input value={scriptDay} onChange={(event) => setScriptDay(event.target.value)} />
              </Field>
              <Field label="Morning/Afternoon">
                <Input value={scriptTimeWindow} onChange={(event) => setScriptTimeWindow(event.target.value)} />
              </Field>
              <Field label="Deposit Link">
                <Input value={depositLink} onChange={(event) => setDepositLink(event.target.value)} />
              </Field>
            </div>

            <div className="space-y-3">
              {orderedScripts.map((script) => (
                <ScriptCard key={script.id} title={script.title} body={fillTemplate(script.body)} />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add context, objections, commitments, and timeline updates..."
            />
            <Button
              disabled={isPending || !note.trim()}
              onClick={() =>
                runAction(async () => addLeadNoteAction({ leadId: lead.id, note: note.trim() }), "Note added.")
              }
            >
              Save note
            </Button>

            {lead.notes ? <pre className="whitespace-pre-wrap rounded-2xl bg-zinc-100 p-3 text-xs text-zinc-700">{lead.notes}</pre> : null}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Activity Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activities.length === 0 ? <p className="text-sm text-zinc-600">No activity yet.</p> : null}
            {activities.map((activity) => (
              <div key={activity.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-zinc-800">{activity.activity_type.replace(/_/g, " ")}</span>
                  <span className="text-xs text-zinc-500">{formatLocalDateTime(activity.created_at)}</span>
                </div>
                <p className="mt-1 text-zinc-700">{activity.message}</p>
                <p className="mt-1 text-xs text-zinc-500">By: {activity.actor_profile?.full_name || "System"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Follow-up Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <p className="text-sm text-zinc-600">No follow-up tasks yet.</p>
            ) : (
              <div className="space-y-2">
                {followUps.map((task) => (
                  <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{task.type}</p>
                      <p className="text-xs text-zinc-500">Due: {formatLocalDateTime(task.due_at)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-full border-zinc-300">
                        {task.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isPending}
                        onClick={() =>
                          runAction(
                            async () => completeFollowUpTaskAction({ leadId: lead.id, taskId: task.id, status: "Completed" }),
                            "Task marked completed."
                          )
                        }
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          runAction(
                            async () => completeFollowUpTaskAction({ leadId: lead.id, taskId: task.id, status: "Skipped" }),
                            "Task skipped."
                          )
                        }
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Close Lead Outcome</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            {LEAD_OUTCOMES.map((outcome) => (
              <Button
                key={outcome}
                variant="outline"
                disabled={isPending}
                onClick={() => runAction(async () => closeLeadAction({ leadId: lead.id, outcome }), `Lead closed: ${outcome}`)}
              >
                Close as {outcome}
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wide text-zinc-500">{label}</Label>
      {children}
    </div>
  );
}

function ScriptCard({ title, body }: { title: string; body: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      toast.success("Script copied.");
    } catch {
      toast.error("Clipboard not available.");
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-900">{title}</p>
        <Button size="sm" variant="secondary" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="mt-2 whitespace-pre-wrap text-xs text-zinc-700">{body}</pre>
    </div>
  );
}
