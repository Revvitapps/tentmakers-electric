"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { normalizeLeadSource } from "@/lib/constants";
import { requireCurrentProfile } from "@/lib/server/auth";
import { failure, success, type ActionResult } from "@/lib/server/action-types";
import { deriveLeadOutcome } from "@/lib/sop";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { csvImportSchema } from "@/lib/validators/csv";
import {
  addNoteSchema,
  closeLeadSchema,
  createLeadSchema,
  setFollowUpSchema,
  toggleRequiredStopSchema,
  updateLeadSchema,
} from "@/lib/validators/lead";

const leadIdSchema = z.object({
  leadId: z.string().uuid(),
});

const escalateLeadSchema = z.object({
  leadId: z.string().uuid(),
});

const completeFollowUpTaskSchema = z.object({
  leadId: z.string().uuid(),
  taskId: z.string().uuid(),
  status: z.enum(["Open", "Completed", "Skipped"]),
});

const importCsvLeadsPayloadSchema = z.object({
  rows: csvImportSchema,
});

async function logLeadActivity(input: {
  leadId: string;
  actorId: string;
  type: string;
  message: string;
}) {
  const supabase = createServerSupabaseClient() as any;

  await (supabase.from("lead_activity") as any).insert({
    lead_id: input.leadId,
    actor_id: input.actorId,
    activity_type: input.type,
    message: input.message,
  });
}

function revalidateLeadViews(leadId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/kpis");
  revalidatePath("/scripts");
  revalidatePath("/leads");

  if (leadId) {
    revalidatePath(`/leads/${leadId}`);
  }
}

async function getJoeProfileId() {
  const supabase = createServerSupabaseClient() as any;
  const { data, error } = await ((supabase
    .from("profiles")
    .select("id")
    .eq("role", "Joe")
    .order("created_at", { ascending: true })
    .limit(1)) as any);

  if (error) {
    return null;
  }

  return data?.[0]?.id ?? null;
}

export async function createLeadAction(input: unknown): Promise<ActionResult<{ leadId: string }>> {
  const parsed = createLeadSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireCurrentProfile();
  const supabase = createServerSupabaseClient() as any;

  const { data, error } = await supabase
    .from("leads")
    .insert({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      address: parsed.data.address,
      source: parsed.data.source,
      job_type: parsed.data.jobType,
      stage: parsed.data.stage,
      notes: parsed.data.notes || null,
      assigned_to: parsed.data.assignedTo || null,
      owner_role: profile.role,
      last_touch_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    return failure(error?.message ?? "Unable to create lead.");
  }

  await logLeadActivity({
    leadId: data.id,
    actorId: profile.id,
    type: "lead_created",
    message: `Lead created by ${profile.full_name}.`,
  });

  revalidateLeadViews(data.id);
  return success("Lead created.", { leadId: data.id });
}

export async function updateLeadAction(input: unknown): Promise<ActionResult<{ warnings: string[] }>> {
  const parsed = updateLeadSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Unable to update lead.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireCurrentProfile();
  const supabase = createServerSupabaseClient() as any;

  const { data: existingLead, error: loadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", parsed.data.leadId)
    .maybeSingle();

  if (loadError || !existingLead) {
    return failure(loadError?.message ?? "Lead not found.");
  }

  let escalatedAssignedTo = parsed.data.assignedTo ?? existingLead.assigned_to;
  let escalatedOwnerRole = parsed.data.ownerRole ?? existingLead.owner_role;

  if (parsed.data.escalationFlag === true) {
    const joeId = await getJoeProfileId();
    escalatedAssignedTo = joeId;
    escalatedOwnerRole = "Joe";
  }

  const merged = {
    stage: parsed.data.stage ?? existingLead.stage,
    source: parsed.data.source ?? existingLead.source,
    depositStatus: parsed.data.depositStatus ?? existingLead.deposit_status,
    apptStatus: parsed.data.apptStatus ?? existingLead.appt_status,
    nextTouchAt: parsed.data.nextTouchAt !== undefined ? parsed.data.nextTouchAt : existingLead.next_touch_at,
    outcome: parsed.data.outcome !== undefined ? parsed.data.outcome : existingLead.outcome,
    notes: parsed.data.notes ?? existingLead.notes,
    escalationFlag: parsed.data.escalationFlag ?? existingLead.escalation_flag,
    assignedTo: escalatedAssignedTo,
    ownerRole: escalatedOwnerRole,
  } as const;

  const derivedOutcome = deriveLeadOutcome({
    currentOutcome: merged.outcome,
    depositStatus: merged.depositStatus,
    apptStatus: merged.apptStatus,
    nextTouchAt: merged.nextTouchAt,
  });

  const finalOutcome = parsed.data.outcome !== undefined ? parsed.data.outcome : derivedOutcome;

  if (merged.stage === "Closed" && !finalOutcome) {
    return failure("Closing a lead requires a final outcome.");
  }

  const warnings: string[] = [];

  if ((merged.stage === "Estimate Sent" || merged.stage === "Follow-Up") && !merged.nextTouchAt) {
    warnings.push("Follow-up not locked.");
  }

  const updatePayload = {
    stage: merged.stage,
    source: merged.source,
    deposit_status: merged.depositStatus,
    appt_status: merged.apptStatus,
    next_touch_at: merged.nextTouchAt,
    outcome: finalOutcome,
    notes: merged.notes,
    escalation_flag: merged.escalationFlag,
    assigned_to: merged.assignedTo,
    owner_role: merged.ownerRole,
    last_touch_at: parsed.data.lastTouchAt ?? new Date().toISOString(),
  };

  const { error: updateError } = await supabase.from("leads").update(updatePayload).eq("id", parsed.data.leadId);

  if (updateError) {
    return failure(updateError.message);
  }

  if (parsed.data.nextTouchAt !== undefined) {
    const { error: stopError } = await supabase
      .from("required_stops")
      .update({ followup_locked: parsed.data.nextTouchAt !== null })
      .eq("lead_id", parsed.data.leadId);

    if (stopError) {
      return failure(stopError.message);
    }
  }

  await logLeadActivity({
    leadId: parsed.data.leadId,
    actorId: profile.id,
    type: "lead_updated",
    message: `Lead updated by ${profile.full_name}.`,
  });

  revalidateLeadViews(parsed.data.leadId);
  return success("Lead updated.", { warnings });
}

export async function toggleRequiredStopAction(input: unknown): Promise<ActionResult> {
  const parsed = toggleRequiredStopSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Invalid checklist update.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireCurrentProfile();
  const supabase = createServerSupabaseClient() as any;

  const { error } = await supabase
    .from("required_stops")
    .update({ [parsed.data.key]: parsed.data.value })
    .eq("lead_id", parsed.data.leadId);

  if (error) {
    return failure(error.message);
  }

  if (parsed.data.key === "estimate_sent" && parsed.data.value) {
    await supabase
      .from("leads")
      .update({
        stage: "Estimate Sent",
        last_touch_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.leadId);
  }

  await logLeadActivity({
    leadId: parsed.data.leadId,
    actorId: profile.id,
    type: "required_stop_updated",
    message: `${parsed.data.key} set to ${parsed.data.value ? "complete" : "incomplete"}.`,
  });

  revalidateLeadViews(parsed.data.leadId);
  return success("Checklist updated.");
}

export async function setFollowUpAction(input: unknown): Promise<ActionResult> {
  const parsed = setFollowUpSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Invalid follow-up date.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireCurrentProfile();
  const supabase = createServerSupabaseClient() as any;

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", parsed.data.leadId)
    .maybeSingle();

  if (leadError || !lead) {
    return failure(leadError?.message ?? "Lead not found.");
  }

  if (lead.stage === "Closed" || lead.outcome === "Explicit No") {
    return failure("Cannot set follow-up on a closed lead.");
  }

  const nextOutcome = deriveLeadOutcome({
    currentOutcome: lead.outcome,
    depositStatus: lead.deposit_status,
    apptStatus: lead.appt_status,
    nextTouchAt: parsed.data.dueAt,
  });

  const stage = lead.stage === "Deposit + Schedule" ? "Deposit + Schedule" : "Follow-Up";

  const { error: updateLeadError } = await supabase
    .from("leads")
    .update({
      stage,
      next_touch_at: parsed.data.dueAt,
      outcome: nextOutcome,
      last_touch_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.leadId);

  if (updateLeadError) {
    return failure(updateLeadError.message);
  }

  const { error: stopError } = await supabase
    .from("required_stops")
    .update({ followup_locked: true })
    .eq("lead_id", parsed.data.leadId);

  if (stopError) {
    return failure(stopError.message);
  }

  const templateByType = {
    Day2: "day2_follow_up",
    Day5: "day5_follow_up",
    Day10: "day10_breakup",
    Custom: "custom_follow_up",
  } as const;

  const { error: taskError } = await supabase.from("follow_up_tasks").insert({
    lead_id: parsed.data.leadId,
    type: parsed.data.type,
    due_at: parsed.data.dueAt,
    status: "Open",
    message_template_key: templateByType[parsed.data.type],
  });

  if (taskError) {
    return failure(taskError.message);
  }

  await logLeadActivity({
    leadId: parsed.data.leadId,
    actorId: profile.id,
    type: "follow_up_locked",
    message: `Follow-up locked for ${new Date(parsed.data.dueAt).toLocaleString()}.`,
  });

  revalidateLeadViews(parsed.data.leadId);
  return success("Follow-up date locked.");
}

export async function closeLeadAction(input: unknown): Promise<ActionResult> {
  const parsed = closeLeadSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Invalid close payload.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireCurrentProfile();
  const supabase = createServerSupabaseClient() as any;

  const { error } = await supabase
    .from("leads")
    .update({
      stage: "Closed",
      outcome: parsed.data.outcome,
      last_touch_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.leadId);

  if (error) {
    return failure(error.message);
  }

  await logLeadActivity({
    leadId: parsed.data.leadId,
    actorId: profile.id,
    type: "lead_closed",
    message: `Lead closed with outcome: ${parsed.data.outcome}.`,
  });

  revalidateLeadViews(parsed.data.leadId);
  return success("Lead closed.");
}

export async function addLeadNoteAction(input: unknown): Promise<ActionResult> {
  const parsed = addNoteSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Invalid note.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireCurrentProfile();
  const supabase = createServerSupabaseClient() as any;

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("notes")
    .eq("id", parsed.data.leadId)
    .maybeSingle();

  if (leadError || !lead) {
    return failure(leadError?.message ?? "Lead not found.");
  }

  const stamp = new Date().toLocaleString();
  const composed = lead.notes ? `${lead.notes}\n\n[${stamp}] ${parsed.data.note}` : `[${stamp}] ${parsed.data.note}`;

  const { error } = await supabase
    .from("leads")
    .update({
      notes: composed,
      last_touch_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.leadId);

  if (error) {
    return failure(error.message);
  }

  await logLeadActivity({
    leadId: parsed.data.leadId,
    actorId: profile.id,
    type: "note_added",
    message: parsed.data.note,
  });

  revalidateLeadViews(parsed.data.leadId);
  return success("Note added.");
}

export async function markEstimateSentAction(input: unknown): Promise<ActionResult> {
  const parsed = leadIdSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Invalid lead id.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireCurrentProfile();
  const supabase = createServerSupabaseClient() as any;

  const now = new Date().toISOString();

  const [{ error: leadError }, { error: stopError }] = await Promise.all([
    supabase
      .from("leads")
      .update({
        stage: "Estimate Sent",
        last_touch_at: now,
      })
      .eq("id", parsed.data.leadId),
    supabase
      .from("required_stops")
      .update({
        estimate_sent: true,
      })
      .eq("lead_id", parsed.data.leadId),
  ]);

  if (leadError || stopError) {
    return failure(leadError?.message ?? stopError?.message ?? "Unable to mark estimate as sent.");
  }

  await logLeadActivity({
    leadId: parsed.data.leadId,
    actorId: profile.id,
    type: "estimate_sent",
    message: "Estimate marked as sent.",
  });

  revalidateLeadViews(parsed.data.leadId);
  return success("Estimate marked sent.");
}

export async function markDepositPaidAction(input: unknown): Promise<ActionResult> {
  const parsed = leadIdSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Invalid lead id.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireCurrentProfile();
  const supabase = createServerSupabaseClient() as any;

  const { error } = await supabase
    .from("leads")
    .update({
      deposit_status: "Paid",
      stage: "Deposit + Schedule",
      outcome: "Deposit secured",
      last_touch_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.leadId);

  if (error) {
    return failure(error.message);
  }

  await logLeadActivity({
    leadId: parsed.data.leadId,
    actorId: profile.id,
    type: "deposit_paid",
    message: "Deposit marked as paid.",
  });

  revalidateLeadViews(parsed.data.leadId);
  return success("Deposit marked paid.");
}

export async function scheduleAppointmentAction(input: unknown): Promise<ActionResult> {
  const parsed = leadIdSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Invalid lead id.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireCurrentProfile();
  const supabase = createServerSupabaseClient() as any;

  const { error } = await supabase
    .from("leads")
    .update({
      appt_status: "Scheduled",
      stage: "Deposit + Schedule",
      outcome: "Appointment scheduled",
      last_touch_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.leadId);

  if (error) {
    return failure(error.message);
  }

  await logLeadActivity({
    leadId: parsed.data.leadId,
    actorId: profile.id,
    type: "appointment_scheduled",
    message: "Appointment marked as scheduled.",
  });

  revalidateLeadViews(parsed.data.leadId);
  return success("Appointment marked scheduled.");
}

export async function escalateLeadAction(input: unknown): Promise<ActionResult> {
  const parsed = escalateLeadSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Invalid lead id.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireCurrentProfile();
  const supabase = createServerSupabaseClient() as any;
  const joeId = await getJoeProfileId();

  const { error } = await supabase
    .from("leads")
    .update({
      escalation_flag: true,
      owner_role: "Joe",
      assigned_to: joeId,
      last_touch_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.leadId);

  if (error) {
    return failure(error.message);
  }

  await logLeadActivity({
    leadId: parsed.data.leadId,
    actorId: profile.id,
    type: "escalated_to_owner",
    message: "Escalated to owner for review.",
  });

  revalidateLeadViews(parsed.data.leadId);
  return success("Lead escalated to owner.");
}

export async function completeFollowUpTaskAction(input: unknown): Promise<ActionResult> {
  const parsed = completeFollowUpTaskSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Invalid task payload.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireCurrentProfile();
  const supabase = createServerSupabaseClient() as any;

  const completedAt = parsed.data.status === "Completed" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("follow_up_tasks")
    .update({
      status: parsed.data.status,
      completed_at: completedAt,
    })
    .eq("id", parsed.data.taskId)
    .eq("lead_id", parsed.data.leadId);

  if (error) {
    return failure(error.message);
  }

  await logLeadActivity({
    leadId: parsed.data.leadId,
    actorId: profile.id,
    type: "follow_up_task_updated",
    message: `Follow-up task set to ${parsed.data.status}.`,
  });

  revalidateLeadViews(parsed.data.leadId);
  return success("Follow-up task updated.");
}

export async function importLeadsFromCsvAction(input: unknown): Promise<ActionResult<{ inserted: number }>> {
  const parsed = importCsvLeadsPayloadSchema.safeParse(input);

  if (!parsed.success) {
    return failure("CSV rows are invalid.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireCurrentProfile();
  const supabase = createServerSupabaseClient() as any;

  const toIsoDate = (value?: string | null) => {
    if (!value) return new Date().toISOString();

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return new Date().toISOString();

    return parsedDate.toISOString();
  };

  const rows = parsed.data.rows.map((row) => ({
    name: row.name.trim(),
    phone: row.phone.trim(),
    email: row.email?.trim() || null,
    address: row.address.trim(),
    source: normalizeLeadSource(row.source),
    job_type: row.jobType.trim(),
    created_at: toIsoDate(row.createdAt),
    last_touch_at: toIsoDate(row.createdAt),
    stage: "First Contact" as const,
    owner_role: profile.role,
  }));

  const { error } = await supabase.from("leads").insert(rows);

  if (error) {
    return failure(error.message);
  }

  revalidateLeadViews();
  return success(`Imported ${rows.length} leads.`, { inserted: rows.length });
}
