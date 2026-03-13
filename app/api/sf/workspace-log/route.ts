import { NextResponse } from "next/server";

import { sfFetch } from "@/lib/sfClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type WorkspacePayload = {
  recordType: "Estimate" | "Job";
  recordId: string;
  followUpDate?: string;
  callOutcome?: string;
  callNote?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient() as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || (profile.role !== "VA" && profile.role !== "Joe")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as WorkspacePayload;
    if (!body?.recordType || !body?.recordId) {
      return NextResponse.json({ error: "recordType and recordId are required" }, { status: 400 });
    }

    const followUpDate = (body.followUpDate ?? "").trim();
    const callOutcome = (body.callOutcome ?? "").trim();
    const callNote = (body.callNote ?? "").trim();

    if (!followUpDate && !callOutcome && !callNote) {
      return NextResponse.json({ error: "Provide followUpDate, callOutcome, or callNote" }, { status: 400 });
    }

    const createdTaskIds: Array<string | number> = [];

    if (followUpDate) {
      const followTask = await sfFetch<Record<string, unknown>>("calendar-tasks", {
        method: "POST",
        json: {
          type: "Follow-up",
          start_date: normalizeDate(followUpDate),
          end_date: normalizeDate(followUpDate),
          description: buildFollowupDescription(body.recordType, body.recordId, callOutcome, callNote),
          estimates_id: body.recordType === "Estimate" ? [body.recordId] : undefined,
          jobs_id: body.recordType === "Job" ? [body.recordId] : undefined,
        },
      });

      const id = extractTaskId(followTask);
      if (id !== null) createdTaskIds.push(id);
    }

    if (callOutcome || callNote) {
      const today = new Date().toISOString().slice(0, 10);
      const callTask = await sfFetch<Record<string, unknown>>("calendar-tasks", {
        method: "POST",
        json: {
          type: "Call Log",
          start_date: today,
          end_date: today,
          description: buildCallDescription(body.recordType, body.recordId, callOutcome, callNote),
          estimates_id: body.recordType === "Estimate" ? [body.recordId] : undefined,
          jobs_id: body.recordType === "Job" ? [body.recordId] : undefined,
        },
      });

      const id = extractTaskId(callTask);
      if (id !== null) createdTaskIds.push(id);
    }

    return NextResponse.json({ ok: true, taskIds: createdTaskIds }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to write updates to Service Fusion",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function buildFollowupDescription(recordType: string, recordId: string, outcome: string, note: string) {
  const parts = [`[Workspace] Follow-up scheduled`, `${recordType} #${recordId}`];
  if (outcome) parts.push(`Outcome: ${outcome}`);
  if (note) parts.push(`Note: ${note}`);
  return parts.join(" | ");
}

function buildCallDescription(recordType: string, recordId: string, outcome: string, note: string) {
  const parts = [`[Workspace] Call logged`, `${recordType} #${recordId}`];
  if (outcome) parts.push(`Outcome: ${outcome}`);
  if (note) parts.push(`Note: ${note}`);
  return parts.join(" | ");
}

function normalizeDate(value: string) {
  const iso = value.match(/^\d{4}-\d{2}-\d{2}$/);
  if (iso) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid follow-up date");
  }
  return parsed.toISOString().slice(0, 10);
}

function extractTaskId(record: Record<string, unknown>): string | number | null {
  const possible = [record.id, record.task_id, record.calendar_task_id];
  for (const value of possible) {
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }
  }
  return null;
}
