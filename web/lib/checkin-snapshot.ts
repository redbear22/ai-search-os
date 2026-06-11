import type { AuditData } from "@/lib/audit-types";
import type { Action } from "@/store/actionStore";
import type { CheckinVersion, KpiSnapshotItem } from "@/store/checkinStore";
import type { KPI } from "@/store/kpiStore";

export function computeShareOfVoice(audit: AuditData): number {
  const brandMentions = audit.discoverability.aso.brandMentions;
  const competitorMentions = audit.discoverability.competitors.reduce(
    (n, c) => n + c.brandMentions,
    0
  );
  const total = brandMentions + competitorMentions;
  return total ? Math.round((brandMentions / total) * 100) : 0;
}

export function kpisToSnapshot(kpis: KPI[]): KpiSnapshotItem[] {
  return kpis.map((k) => ({
    kpiId: k.id,
    name: k.name,
    layerId: k.layerId,
    currentValue: k.currentValue,
    targetValue: k.targetValue,
    unit: k.unit,
  }));
}

export function buildCheckinVersion(
  kpis: KPI[],
  audit: AuditData,
  actions: Action[],
  versionNumber: number,
  notes: string
): CheckinVersion {
  return {
    id: `checkin-${Date.now()}`,
    versionNumber,
    kpiSnapshot: kpisToSnapshot(kpis),
    auditSnapshot: audit,
    actionSnapshot: actions.map((a) => ({ ...a })),
    shareOfVoice: computeShareOfVoice(audit),
    createdAt: new Date().toISOString(),
    notes,
  };
}
