import type { AuditData } from "@/lib/audit-types";
import { AUDIT_LAYER_META } from "@/lib/audit-types";
import type { Action } from "@/store/actionStore";
import { kpiProgress, type KPI } from "@/store/kpiStore";
import type { SummaryVersion } from "@/store/summaryStore";

function layerAvgProgress(kpis: KPI[], layerId: KPI["layerId"]): number {
  const layerKpis = kpis.filter((k) => k.layerId === layerId);
  if (!layerKpis.length) return 0;
  return Math.round(layerKpis.reduce((n, k) => n + kpiProgress(k), 0) / layerKpis.length);
}

function overallProgress(kpis: KPI[]): number {
  if (!kpis.length) return 0;
  return Math.round(kpis.reduce((n, k) => n + kpiProgress(k), 0) / kpis.length);
}

function weakestLayer(kpis: KPI[]): { title: string; progress: number } | null {
  let worst: { title: string; progress: number } | null = null;
  for (const meta of AUDIT_LAYER_META) {
    const progress = layerAvgProgress(kpis, meta.id);
    if (!worst || progress < worst.progress) {
      worst = { title: meta.title, progress };
    }
  }
  return worst;
}

function strongestLayer(kpis: KPI[]): { title: string; progress: number } | null {
  let best: { title: string; progress: number } | null = null;
  for (const meta of AUDIT_LAYER_META) {
    const progress = layerAvgProgress(kpis, meta.id);
    if (!best || progress > best.progress) {
      best = { title: meta.title, progress };
    }
  }
  return best;
}

export function generateSummaryDraft(
  kpis: KPI[],
  actions: Action[],
  audit: AuditData | null,
  nextVersion: number
): Omit<SummaryVersion, "id"> {
  const overall = overallProgress(kpis);
  const weak = weakestLayer(kpis);
  const strong = strongestLayer(kpis);
  const behindKpis = kpis.filter((k) => kpiProgress(k) < 80);

  const visibility = audit?.discoverability.aso.aiVisibilityScore;
  const brandMentions = audit?.discoverability.aso.brandMentions;
  const citedSources = audit?.authority.sourcesCitingUs.length ?? 0;
  const competitorOnly = audit?.authority.sourcesCitingCompetitorsOnly.length ?? 0;

  const opportunityParts: string[] = [
    `AI Search OS audit v${nextVersion} shows ${overall}% overall KPI progress across Discoverability, Clarity, Authority, and Trust.`,
  ];

  if (strong) {
    opportunityParts.push(
      `${strong.title} leads at ${strong.progress}% on track — a foundation to scale AI-mediated discovery.`
    );
  }

  if (visibility != null && visibility > 0) {
    opportunityParts.push(
      `Current AI visibility score is ${visibility} with brand mentions at ${brandMentions ?? 0}; closing gaps in underperforming layers can materially improve how LLMs surface and describe the brand.`
    );
  }

  if (citedSources > 0) {
    opportunityParts.push(
      `${citedSources} unique sources already cite us — expanding this footprint strengthens authoritative AI answers.`
    );
  }

  const riskParts: string[] = [];

  if (weak && weak.progress < 80) {
    riskParts.push(
      `${weak.title} is the weakest layer at ${weak.progress}% on track. Delaying remediation risks inconsistent AI answers and lost share of voice in generative search.`
    );
  }

  if (behindKpis.length > 0) {
    const names = behindKpis.slice(0, 3).map((k) => k.name).join(", ");
    riskParts.push(
      `${behindKpis.length} KPI${behindKpis.length > 1 ? "s" : ""} remain below 80% progress (${names}${behindKpis.length > 3 ? ", …" : ""}), signaling measurable visibility and trust gaps.`
    );
  }

  if (competitorOnly > 0) {
    riskParts.push(
      `${competitorOnly} high-authority sources cite competitors but not us — inaction cedes narrative control in AI-generated recommendations.`
    );
  }

  if (audit?.trust.hedgedLanguageDetected) {
    riskParts.push(
      "Hedged language detected in AI responses suggests the brand is not positioned as a definitive authority."
    );
  }

  if (riskParts.length === 0) {
    riskParts.push(
      "Without sustained investment across all four layers, gains in one area may erode as models refresh training and retrieval sources quarterly."
    );
  }

  const resourceMap = new Map<string, number>();
  for (const action of actions) {
    for (const ask of action.resourceAsks) {
      resourceMap.set(ask, (resourceMap.get(ask) ?? 0) + 1);
    }
  }

  const pendingActions = actions.filter((a) => a.status !== "completed");
  const resourceLines = [...resourceMap.entries()].map(
    ([ask, count]) => `${ask}${count > 1 ? ` (×${count})` : ""}`
  );

  const resourceAskSummary =
    resourceLines.length > 0
      ? `90-day plan requires: ${resourceLines.join("; ")}. ${pendingActions.length} action${pendingActions.length !== 1 ? "s" : ""} across ${new Set(pendingActions.map((a) => a.ownerTeam)).size} teams.`
      : `${pendingActions.length} prioritized action${pendingActions.length !== 1 ? "s" : ""} in the 90-day plan; confirm resourcing with layer owners before kickoff.`;

  return {
    version: nextVersion,
    opportunity: opportunityParts.join(" "),
    riskOfInaction: riskParts.join(" "),
    resourceAskSummary,
    createdAt: new Date().toISOString(),
  };
}
