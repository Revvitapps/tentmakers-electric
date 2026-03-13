import { differenceInMinutes } from "date-fns";

import type { Estimate, LeadSource, LeadStage, LeadWithStops, ScriptTemplate } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DashboardFilters = {
  query?: string;
  source?: LeadSource | "all";
  stage?: LeadStage | "all";
  assignedTo?: string | "all";
};

export async function getDashboardData(filters: DashboardFilters = {}) {
  const supabase = createServerSupabaseClient() as any;

  let queryBuilder = supabase
    .from("leads")
    .select("*, required_stops(*), assigned_profile:profiles!leads_assigned_to_fkey(id, full_name, role)")
    .order("updated_at", { ascending: false });

  if (filters.source && filters.source !== "all") {
    queryBuilder = queryBuilder.eq("source", filters.source);
  }

  if (filters.stage && filters.stage !== "all") {
    queryBuilder = queryBuilder.eq("stage", filters.stage);
  }

  if (filters.assignedTo && filters.assignedTo !== "all") {
    queryBuilder = queryBuilder.eq("assigned_to", filters.assignedTo);
  }

  const { data: leads, error } = await queryBuilder;

  if (error) {
    throw new Error(`Failed loading leads: ${error.message}`);
  }

  const allLeads = (leads ?? []) as LeadWithStops[];

  const searchedLeads = !filters.query
    ? allLeads
    : allLeads.filter((lead) =>
        [lead.name, lead.phone, lead.email ?? "", lead.address, lead.job_type].join(" ").toLowerCase().includes(filters.query!.toLowerCase())
      );

  const now = new Date();

  const kpis = {
    total: allLeads.length,
    estimates: allLeads.filter((lead) => lead.required_stops?.estimate_sent).length,
    deposits: allLeads.filter((lead) => lead.deposit_status === "Paid").length,
    scheduled: allLeads.filter((lead) => lead.appt_status === "Scheduled").length,
    followupsDue: allLeads.filter((lead) => lead.next_touch_at && new Date(lead.next_touch_at) <= now).length,
    closeRate: calculateCloseRate(allLeads),
  };

  const followUpsDue = allLeads
    .filter((lead) => lead.next_touch_at && new Date(lead.next_touch_at) <= now && lead.stage !== "Closed")
    .sort((a, b) => new Date(a.next_touch_at ?? 0).getTime() - new Date(b.next_touch_at ?? 0).getTime());

  const { data: assignees } = await supabase.from("profiles").select("id, full_name, role").order("full_name", { ascending: true });

  return {
    leads: searchedLeads,
    kpis,
    followUpsDue,
    assignees: assignees ?? [],
  };
}

export async function getLeadById(leadId: string) {
  const supabase = createServerSupabaseClient() as any;

  const [{ data: lead, error: leadError }, { data: activities }, { data: scripts }, { data: followUps }] = await Promise.all([
    supabase
      .from("leads")
      .select("*, required_stops(*), assigned_profile:profiles!leads_assigned_to_fkey(id, full_name, role), estimate:estimates(*)")
      .eq("id", leadId)
      .maybeSingle(),
    supabase
      .from("lead_activity")
      .select("*, actor_profile:profiles!lead_activity_actor_id_fkey(id, full_name, role)")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("script_templates").select("*").order("title", { ascending: true }),
    supabase
      .from("follow_up_tasks")
      .select("*")
      .eq("lead_id", leadId)
      .order("due_at", { ascending: false })
      .limit(10),
  ]);

  if (leadError) {
    throw new Error(`Failed loading lead: ${leadError.message}`);
  }

  return {
    lead: lead as (LeadWithStops & { estimate: Estimate | null }) | null,
    activities: activities ?? [],
    scripts: (scripts ?? []) as ScriptTemplate[],
    followUps: followUps ?? [],
  };
}

export async function getScriptTemplates() {
  const supabase = createServerSupabaseClient() as any;
  const { data, error } = await supabase.from("script_templates").select("*").order("is_system", { ascending: false }).order("title", { ascending: true });

  if (error) {
    throw new Error(`Failed loading scripts: ${error.message}`);
  }

  return (data ?? []) as ScriptTemplate[];
}

export async function getKpiData() {
  const supabase = createServerSupabaseClient() as any;
  const { data, error } = await supabase.from("leads").select("*");

  if (error) {
    throw new Error(`Failed loading KPI data: ${error.message}`);
  }

  const leads: any[] = data ?? [];

  const estimatesSent = leads.filter((lead) => ["Estimate Sent", "Deposit + Schedule", "Closed"].includes(lead.stage)).length;
  const depositsPaid = leads.filter((lead) => lead.deposit_status === "Paid").length;

  const bySource = leads.reduce<Record<string, { leads: number; deposits: number; estimates: number }>>((acc, lead) => {
    if (!acc[lead.source]) {
      acc[lead.source] = { leads: 0, deposits: 0, estimates: 0 };
    }

    acc[lead.source].leads += 1;

    if (["Estimate Sent", "Deposit + Schedule", "Closed"].includes(lead.stage)) {
      acc[lead.source].estimates += 1;
    }

    if (lead.deposit_status === "Paid") {
      acc[lead.source].deposits += 1;
    }

    return acc;
  }, {});

  const sourceRows = Object.entries(bySource).map(([source, values]) => ({
    source,
    leads: values.leads,
    estimates: values.estimates,
    deposits: values.deposits,
    closeRate: values.estimates ? Number(((values.deposits / values.estimates) * 100).toFixed(1)) : 0,
  }));

  const byStage = leads.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.stage] = (acc[lead.stage] ?? 0) + 1;
    return acc;
  }, {});

  const stageRows = Object.entries(byStage).map(([stage, count]) => ({
    stage,
    count,
  }));

  const responseMinutes = leads
    .map((lead) => {
      if (!lead.last_touch_at || !lead.created_at) {
        return null;
      }

      const minutes = differenceInMinutes(new Date(lead.last_touch_at), new Date(lead.created_at));
      return minutes >= 0 ? minutes : null;
    })
    .filter((minutes): minutes is number => minutes !== null);

  const averageResponseMinutes =
    responseMinutes.length === 0 ? 0 : Math.round(responseMinutes.reduce((total, value) => total + value, 0) / responseMinutes.length);

  return {
    totals: {
      leads: leads.length,
      estimatesSent,
      depositsPaid,
      closeRate: estimatesSent ? Number(((depositsPaid / estimatesSent) * 100).toFixed(1)) : 0,
      averageResponseMinutes,
    },
    sourceRows,
    stageRows,
  };
}

function calculateCloseRate(leads: LeadWithStops[]) {
  const estimates = leads.filter((lead) => lead.required_stops?.estimate_sent).length;
  const deposits = leads.filter((lead) => lead.deposit_status === "Paid").length;

  if (!estimates) return 0;
  return Number(((deposits / estimates) * 100).toFixed(1));
}
