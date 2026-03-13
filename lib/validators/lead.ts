import { z } from "zod";

import { APPT_STATUSES, DEPOSIT_STATUSES, LEAD_OUTCOMES, LEAD_SOURCES, LEAD_STAGES } from "@/lib/constants";

export const requiredStopKeys = [
  "scope_confirmed",
  "timeline_asked",
  "decision_maker_asked",
  "photos_received",
  "estimate_sent",
  "option_recommended",
  "dates_offered",
  "deposit_asked",
  "followup_locked",
  "documented_in_service_fusion",
] as const;

export const createLeadSchema = z.object({
  name: z.string().min(2, "Name is required."),
  phone: z.string().min(7, "Phone is required."),
  email: z.string().email("Enter a valid email.").optional().or(z.literal("")),
  address: z.string().min(4, "Address is required."),
  source: z.enum(LEAD_SOURCES),
  jobType: z.string().min(2, "Job type is required."),
  stage: z.enum(LEAD_STAGES).default("First Contact"),
  notes: z.string().optional(),
  assignedTo: z.string().uuid().optional().or(z.literal("")),
});

export const updateLeadSchema = z.object({
  leadId: z.string().uuid(),
  stage: z.enum(LEAD_STAGES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  depositStatus: z.enum(DEPOSIT_STATUSES).optional(),
  apptStatus: z.enum(APPT_STATUSES).optional(),
  outcome: z.enum(LEAD_OUTCOMES).nullable().optional(),
  notes: z.string().optional(),
  lastTouchAt: z.string().datetime().optional(),
  nextTouchAt: z.string().datetime().nullable().optional(),
  escalationFlag: z.boolean().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  ownerRole: z.enum(["VA", "Joe"]).optional(),
});

export const toggleRequiredStopSchema = z.object({
  leadId: z.string().uuid(),
  key: z.enum(requiredStopKeys),
  value: z.boolean(),
});

export const setFollowUpSchema = z.object({
  leadId: z.string().uuid(),
  dueAt: z.string().datetime(),
  type: z.enum(["Day2", "Day5", "Day10", "Custom"]),
});

export const addNoteSchema = z.object({
  leadId: z.string().uuid(),
  note: z.string().min(1, "Note is required."),
});

export const closeLeadSchema = z.object({
  leadId: z.string().uuid(),
  outcome: z.enum(LEAD_OUTCOMES),
});

export type CreateLeadSchema = z.infer<typeof createLeadSchema>;
