import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString();
}

export function calculateSopScore(requiredStops: Record<string, boolean>) {
  const values = Object.values(requiredStops);
  const completed = values.filter(Boolean).length;
  return Math.round((completed / values.length) * 100);
}

export function healthColorClass(score: number) {
  if (score >= 85) return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
  if (score >= 60) return "bg-amber-500/10 text-amber-700 border-amber-200";
  return "bg-rose-500/10 text-rose-700 border-rose-200";
}

export function initials(name: string) {
  const chunks = name.trim().split(/\s+/).filter(Boolean);
  return chunks.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
}
