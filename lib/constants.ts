export const LEAD_SOURCES = ["Google/Direct", "Thumbtack", "Yelp", "BNI/Referral", "Website", "Other"] as const;
export const LEAD_STAGES = [
  "First Contact",
  "Qualification",
  "Estimate Sent",
  "Deposit + Schedule",
  "Follow-Up",
  "Closed",
] as const;
export const DEPOSIT_STATUSES = ["Not Requested", "Requested", "Paid"] as const;
export const APPT_STATUSES = ["Not Scheduled", "Scheduled"] as const;
export const LEAD_OUTCOMES = [
  "Deposit secured",
  "Appointment scheduled",
  "Follow-up date locked",
  "Explicit No",
] as const;
export const APP_ROLES = ["VA", "Joe"] as const;

export const FOLLOW_UP_PRESETS = [
  { label: "Day 2", days: 2, type: "Day2" as const },
  { label: "Day 5", days: 5, type: "Day5" as const },
  { label: "Day 10 (Breakup)", days: 10, type: "Day10" as const },
];

export const DEFAULT_SCRIPTS = [
  "timeline_decision_maker",
  "preframe_before_estimate",
  "estimate_delivery_close",
  "deposit_ask",
  "day2_follow_up",
  "day5_follow_up",
  "day10_breakup",
  "deescalation_conflict",
] as const;

const sourceAliases: Record<string, (typeof LEAD_SOURCES)[number]> = {
  google: "Google/Direct",
  direct: "Google/Direct",
  "google/direct": "Google/Direct",
  thumbtack: "Thumbtack",
  yelp: "Yelp",
  bni: "BNI/Referral",
  referral: "BNI/Referral",
  "bni/referral": "BNI/Referral",
  website: "Website",
  web: "Website",
  other: "Other",
};

export function normalizeLeadSource(value: string | null | undefined): (typeof LEAD_SOURCES)[number] {
  if (!value) return "Other";

  const directMatch = LEAD_SOURCES.find((source) => source.toLowerCase() === value.trim().toLowerCase());
  if (directMatch) return directMatch;

  const normalized = value.trim().toLowerCase();
  return sourceAliases[normalized] ?? "Other";
}
