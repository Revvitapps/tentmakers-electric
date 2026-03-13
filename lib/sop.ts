import type { DepositStatus, AppointmentStatus, LeadOutcome, LeadStage, RequiredStops } from "@/lib/types";

export function calculateRequiredStopsScore(stops: RequiredStops | null) {
  if (!stops) return 0;

  const values = [
    stops.scope_confirmed,
    stops.timeline_asked,
    stops.decision_maker_asked,
    stops.photos_received,
    stops.estimate_sent,
    stops.option_recommended,
    stops.dates_offered,
    stops.deposit_asked,
    stops.followup_locked,
    stops.documented_in_service_fusion,
  ];

  const completed = values.filter(Boolean).length;
  return Math.round((completed / values.length) * 100);
}

export function getSopHealthLabel(score: number) {
  if (score >= 85) return "Green";
  if (score >= 60) return "Yellow";
  return "Red";
}

export function hasEstimateCloseGap(stops: RequiredStops | null) {
  if (!stops) return false;
  if (!stops.estimate_sent) return false;

  return !stops.dates_offered || !stops.deposit_asked;
}

export function followUpLockMissing(stage: LeadStage, nextTouchAt: string | null) {
  if (stage !== "Estimate Sent" && stage !== "Follow-Up") {
    return false;
  }

  return !nextTouchAt;
}

export function deriveLeadOutcome(params: {
  currentOutcome: LeadOutcome | null;
  depositStatus: DepositStatus;
  apptStatus: AppointmentStatus;
  nextTouchAt: string | null;
}): LeadOutcome | null {
  const { currentOutcome, depositStatus, apptStatus, nextTouchAt } = params;

  if (currentOutcome === "Explicit No") {
    return "Explicit No";
  }

  if (depositStatus === "Paid") {
    return "Deposit secured";
  }

  if (apptStatus === "Scheduled") {
    return "Appointment scheduled";
  }

  if (nextTouchAt) {
    return "Follow-up date locked";
  }

  return null;
}

export function hasFloatingLead(outcome: LeadOutcome | null) {
  return outcome === null;
}
