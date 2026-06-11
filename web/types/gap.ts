import type { AuditLayerId } from "@/lib/audit-types";

export type GapSeverity = "critical" | "high" | "medium" | "low";

export interface Gap {
  id: string;
  layer: AuditLayerId;
  title: string;
  description: string;
  severity: GapSeverity;
  source: string;
  suggestedAction: string;
  suggestedOwner: string;
  suggestedTimeline: number;
  severityScore?: number;
}

export function getGapSummary(gaps: Gap[]) {
  return {
    total: gaps.length,
    byLayer: {
      discoverability: gaps.filter((g) => g.layer === "discoverability").length,
      clarity: gaps.filter((g) => g.layer === "clarity").length,
      authority: gaps.filter((g) => g.layer === "authority").length,
      trust: gaps.filter((g) => g.layer === "trust").length,
    },
    bySeverity: {
      critical: gaps.filter((g) => g.severity === "critical").length,
      high: gaps.filter((g) => g.severity === "high").length,
      medium: gaps.filter((g) => g.severity === "medium").length,
      low: gaps.filter((g) => g.severity === "low").length,
    },
  };
}

export type GapSummary = ReturnType<typeof getGapSummary>;

export function gapsToActions(gaps: Gap[]) {
  return gaps.map((gap) => ({
    id: gap.id,
    layerId: gap.layer,
    description: `${gap.title}: ${gap.suggestedAction}`,
    ownerTeam: gap.suggestedOwner.split("/")[0]?.trim() || gap.suggestedOwner,
    ownerPerson: "",
    dueWeek: gap.suggestedTimeline,
    resourceAsks: [] as string[],
    status: "not_started" as const,
    createdAt: new Date().toISOString(),
  }));
}
