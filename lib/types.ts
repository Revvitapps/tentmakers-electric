import type { Database } from "@/lib/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type LeadSource = Database["public"]["Enums"]["lead_source"];
export type LeadStage = Database["public"]["Enums"]["lead_stage"];
export type DepositStatus = Database["public"]["Enums"]["deposit_status"];
export type AppointmentStatus = Database["public"]["Enums"]["appt_status"];
export type LeadOutcome = Database["public"]["Enums"]["lead_outcome"];
export type FollowUpTaskType = Database["public"]["Enums"]["follow_up_type"];
export type FollowUpTaskStatus = Database["public"]["Enums"]["task_status"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type RequiredStops = Database["public"]["Tables"]["required_stops"]["Row"];
export type Estimate = Database["public"]["Tables"]["estimates"]["Row"];
export type ScriptTemplate = Database["public"]["Tables"]["script_templates"]["Row"];
export type FollowUpTask = Database["public"]["Tables"]["follow_up_tasks"]["Row"];
export type LeadActivity = Database["public"]["Tables"]["lead_activity"]["Row"];

export type LeadWithStops = Lead & {
  required_stops: RequiredStops | null;
  assigned_profile: Pick<Profile, "id" | "full_name" | "role"> | null;
};
