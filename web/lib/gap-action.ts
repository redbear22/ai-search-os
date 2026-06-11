import type { Gap } from "@/types/gap";
import type { GapFix } from "@/types";

export function resolveDueWeek(gap: Gap, fix: GapFix): number {
  if (gap.suggestedTimeline > 0) return gap.suggestedTimeline;

  const effort = fix.estimatedEffort.trim().toLowerCase();
  if (effort === "1-2 hours") return 1;
  if (effort === "2-4 hours") return 2;
  if (effort === "4-8 hours") return 3;
  return 4;
}

export function truncateActionDescription(action: string, max = 200): string {
  if (action.length <= max) return action;
  return `${action.substring(0, max - 3)}...`;
}
