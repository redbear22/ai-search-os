import type { Prisma } from "@prisma/client";
import { computeShareOfVoice } from "@/lib/checkin-snapshot";
import { parseAuditData } from "@/lib/client-portal";
import { prisma } from "@/lib/prisma";
import type {
  ChartData,
  ClientFacingROI,
  ClientPortalROI,
  OpportunityAnalysis,
  PredictiveROI,
  PrioritizedAction,
  RealTimeROI,
} from "@/types/predictive-roi";

import { runExecutiveSummary } from "@/lib/server/ai-tasks";

const DEFAULT_MONTHLY_RETAINER = 3000;
const DEFAULT_CONVERSION_RATE = 0.025;

const CPC_BY_LAYER: Record<string, number> = {
  discoverability: 3.5,
  clarity: 2.8,
  authority: 6.5,
  trust: 2.2,
};

const VOLUME_BY_SEVERITY: Record<string, number> = {
  critical: 1200,
  high: 800,
  medium: 400,
  low: 150,
};

const SOV_UPLIFT_BY_SEVERITY: Record<string, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0.5,
};

const VALUE_BY_PIPELINE: Record<string, number> = {
  citation_outreach: 4200,
  content_generation: 2800,
  entity_optimization: 3200,
};

type AuditRow = {
  auditData: Prisma.JsonValue;
  gapCount: number;
  createdAt: Date;
};

type GapRow = {
  id?: string;
  layer: string;
  severity: string;
  title: string;
  description: string;
  suggestedTimeline: string | null;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type PipelineRow = {
  status: string;
  pipelineType: string;
  createdAt: Date;
  completedAt: Date | null;
};

type ActionRow = {
  status: string;
  description: string;
};

export type PredictiveROIInput = {
  clientId: string;
  clientName: string;
  monthlyRetainer?: number | null;
  conversionRate?: number | null;
  audits: AuditRow[];
  gaps: GapRow[];
  pipelineRuns: PipelineRow[];
  actions: ActionRow[];
};

function cpcForLayer(layer: string): number {
  return CPC_BY_LAYER[layer.toLowerCase()] ?? 3.0;
}

function volumeForSeverity(severity: string): number {
  return VOLUME_BY_SEVERITY[severity.toLowerCase()] ?? 300;
}

function sovUpliftForSeverity(severity: string): number {
  return SOV_UPLIFT_BY_SEVERITY[severity.toLowerCase()] ?? 1;
}

function effortForGap(gap: GapRow): PrioritizedAction["effort"] {
  if (gap.severity === "critical" || gap.severity === "high") return "high";
  if (gap.layer === "authority" || gap.title.toLowerCase().includes("citation")) return "medium";
  return "low";
}

function gapTrafficValue(gap: GapRow): number {
  const volume = volumeForSeverity(gap.severity);
  const cpc = cpcForLayer(gap.layer);
  const citationBoost =
    gap.layer === "authority" || gap.title.toLowerCase().includes("citation") ? 1.35 : 1;
  return Math.round(volume * cpc * citationBoost);
}

function computeCurrentSOV(audits: AuditRow[]): number {
  const latest = audits[0] ? parseAuditData(audits[0].auditData) : null;
  return latest ? computeShareOfVoice(latest) : 0;
}

function computePotentialSOV(currentSOV: number, openGaps: GapRow[]): number {
  const uplift = openGaps.reduce((sum, gap) => sum + sovUpliftForSeverity(gap.severity), 0);
  return Math.min(95, Math.round(currentSOV + Math.min(35, uplift)));
}

function countAdditionalCitations(openGaps: GapRow[]): number {
  return openGaps.filter(
    (g) =>
      g.layer === "authority" ||
      g.title.toLowerCase().includes("citation") ||
      g.description.toLowerCase().includes("citation")
  ).length;
}

function buildOpportunityAnalysis(
  audits: AuditRow[],
  gaps: GapRow[],
  conversionRate: number
): OpportunityAnalysis {
  const openGaps = gaps.filter((g) => g.status !== "resolved");
  const currentSOV = computeCurrentSOV(audits);
  const potentialSOV = computePotentialSOV(currentSOV, openGaps);
  const additionalCitations = countAdditionalCitations(openGaps);

  const estimatedTrafficValue = openGaps.reduce((sum, gap) => sum + gapTrafficValue(gap), 0);
  const estimatedRevenueImpact = Math.round(estimatedTrafficValue * conversionRate);

  return {
    currentSOV,
    potentialSOV,
    additionalCitations,
    estimatedTrafficValue,
    estimatedRevenueImpact,
  };
}

function computeImprovementRate(audits: AuditRow[], gaps: GapRow[]): number {
  if (audits.length >= 2) {
    const latest = parseAuditData(audits[0].auditData);
    const previous = parseAuditData(audits[1].auditData);
    if (latest && previous) {
      const latestSOV = computeShareOfVoice(latest);
      const previousSOV = computeShareOfVoice(previous);
      const weeksBetween = Math.max(
        1,
        (audits[0].createdAt.getTime() - audits[1].createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      const sovDelta = latestSOV - previousSOV;
      return Math.round((sovDelta / weeksBetween) * 10) / 10;
    }
  }

  const resolvedRecently = gaps.filter((g) => {
    if (g.status !== "resolved" || !g.updatedAt || !g.createdAt) return false;
    const days = (g.updatedAt.getTime() - g.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    return days <= 14;
  }).length;

  const openCount = gaps.filter((g) => g.status !== "resolved").length;
  if (openCount === 0) return 0;

  return Math.round((resolvedRecently / Math.max(openCount, 1)) * 100 * 10) / 10;
}

function computeValueDelivered(
  gaps: GapRow[],
  pipelineRuns: PipelineRow[],
  actions: ActionRow[]
): number {
  const resolvedValue = gaps
    .filter((g) => g.status === "resolved")
    .reduce((sum, gap) => sum + gapTrafficValue(gap) * 0.4, 0);

  const pipelineValue = pipelineRuns
    .filter((r) => r.status === "completed")
    .reduce((sum, run) => sum + (VALUE_BY_PIPELINE[run.pipelineType] ?? 1500), 0);

  const actionValue = actions
    .filter((a) => a.status === "completed")
    .reduce((sum, action) => {
      const desc = action.description.toLowerCase();
      if (desc.includes("critical") || desc.includes("citation")) return sum + 4200;
      if (desc.includes("content") || desc.includes("schema")) return sum + 2800;
      return sum + 1500;
    }, 0);

  return Math.round(resolvedValue + pipelineValue + actionValue);
}

function buildRealTimeROI(
  input: PredictiveROIInput,
  opportunity: OpportunityAnalysis,
  conversionRate: number
): RealTimeROI {
  const monthlyRetainer = input.monthlyRetainer ?? DEFAULT_MONTHLY_RETAINER;
  const improvementRate = computeImprovementRate(input.audits, input.gaps);
  const valueDelivered = computeValueDelivered(input.gaps, input.pipelineRuns, input.actions);

  const sovGap = opportunity.potentialSOV - opportunity.currentSOV;
  const monthlyTrafficLift = Math.round(
    (opportunity.estimatedTrafficValue * (sovGap / Math.max(opportunity.potentialSOV, 1))) / 12
  );
  const projectedMonthlyValue = Math.round(
    monthlyTrafficLift * conversionRate + valueDelivered / Math.max(input.audits.length, 1)
  );

  const timeToBreakEven =
    projectedMonthlyValue > monthlyRetainer
      ? Math.max(
          0,
          Math.round((monthlyRetainer / Math.max(projectedMonthlyValue - monthlyRetainer, 1)) * 30)
        )
      : projectedMonthlyValue > 0
        ? Math.round((monthlyRetainer / projectedMonthlyValue) * 30)
        : 365;

  return {
    improvementRate,
    valueDelivered,
    timeToBreakEven,
    projectedMonthlyValue,
  };
}

function buildRecommendations(openGaps: GapRow[]): PrioritizedAction[] {
  return openGaps
    .map((gap) => ({
      priority: 0,
      action: gap.title,
      layer: gap.layer,
      severity: gap.severity,
      estimatedImpact: gapTrafficValue(gap),
      effort: effortForGap(gap),
      gapId: gap.id,
    }))
    .sort((a, b) => b.estimatedImpact - a.estimatedImpact)
    .map((item, index) => ({ ...item, priority: index + 1 }))
    .slice(0, 8);
}

function buildCharts(
  audits: AuditRow[],
  opportunity: OpportunityAnalysis,
  realTime: RealTimeROI,
  gaps: GapRow[]
): ChartData[] {
  const sovHistory: ChartData = {
    id: "sov-trend",
    type: "line",
    title: "Share of Voice Trend",
    labels: [],
    datasets: [{ label: "SOV %", data: [], color: "#3b82f6" }],
  };

  const sortedAudits = [...audits].reverse();
  for (const audit of sortedAudits) {
    const parsed = parseAuditData(audit.auditData);
    if (!parsed) continue;
    sovHistory.labels.push(
      audit.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    );
    sovHistory.datasets[0].data.push(computeShareOfVoice(parsed));
  }

  if (sovHistory.labels.length === 0) {
    sovHistory.labels.push("Current", "Potential");
    sovHistory.datasets[0].data.push(opportunity.currentSOV, opportunity.potentialSOV);
  }

  const openGaps = gaps.filter((g) => g.status !== "resolved");
  const layerCounts: Record<string, number> = {};
  for (const gap of openGaps) {
    layerCounts[gap.layer] = (layerCounts[gap.layer] ?? 0) + 1;
  }

  const gapByLayer: ChartData = {
    id: "gaps-by-layer",
    type: "bar",
    title: "Open Gaps by Layer",
    labels: Object.keys(layerCounts).length > 0 ? Object.keys(layerCounts) : ["No gaps"],
    datasets: [
      {
        label: "Gap count",
        data: Object.keys(layerCounts).length > 0 ? Object.values(layerCounts) : [0],
        color: "#f59e0b",
      },
    ],
  };

  const valueProjection: ChartData = {
    id: "value-projection",
    type: "area",
    title: "Value Projection (12 mo)",
    labels: ["Now", "Mo 3", "Mo 6", "Mo 9", "Mo 12"],
    datasets: [
      {
        label: "Cumulative value ($)",
        data: [0, 1, 2, 3, 4].map((m) =>
          Math.round(realTime.projectedMonthlyValue * m * (1 + realTime.improvementRate / 100))
        ),
        color: "#10b981",
      },
    ],
  };

  return [sovHistory, gapByLayer, valueProjection];
}

function computeConfidenceScore(input: PredictiveROIInput): number {
  let score = 0;
  const weights = {
    hasAudit: 30,
    multipleAudits: 15,
    hasGaps: 20,
    hasResolvedGaps: 10,
    hasPipelineRuns: 10,
    hasActions: 10,
    hasCompetitors: 5,
  };

  if (input.audits.length > 0) score += weights.hasAudit;
  if (input.audits.length >= 2) score += weights.multipleAudits;
  if (input.gaps.length > 0) score += weights.hasGaps;
  if (input.gaps.some((g) => g.status === "resolved")) score += weights.hasResolvedGaps;
  if (input.pipelineRuns.length > 0) score += weights.hasPipelineRuns;
  if (input.actions.length > 0) score += weights.hasActions;

  const latestAudit = input.audits[0] ? parseAuditData(input.audits[0].auditData) : null;
  if (latestAudit && latestAudit.discoverability.competitors.length > 0) {
    score += weights.hasCompetitors;
  }

  return Math.min(100, score);
}

function buildExecutiveSummaryTemplate(
  clientName: string,
  opportunity: OpportunityAnalysis,
  realTime: RealTimeROI,
  recommendations: PrioritizedAction[]
): string {
  const sovGap = opportunity.potentialSOV - opportunity.currentSOV;
  const topAction = recommendations[0]?.action ?? "addressing identified visibility gaps";

  return (
    `${clientName} currently holds ${opportunity.currentSOV}% AI share of voice with ` +
    `potential to reach ${opportunity.potentialSOV}% (+${sovGap} pts) by closing ${recommendations.length} priority gaps. ` +
    `Fixing citation and discoverability issues could unlock ~$${opportunity.estimatedTrafficValue.toLocaleString()} in annual traffic value ` +
    `and ~$${opportunity.estimatedRevenueImpact.toLocaleString()} in estimated revenue impact. ` +
    `Engagement has delivered $${realTime.valueDelivered.toLocaleString()} in measurable value to date ` +
    `with ${realTime.improvementRate}% weekly improvement. ` +
    `Top priority: ${topAction}.`
  );
}

async function maybeEnhanceExecutiveSummary(
  template: string,
  clientName: string
): Promise<string> {
  return runExecutiveSummary({ clientName, template }, template);
}

async function buildClientFacing(
  input: PredictiveROIInput,
  opportunity: OpportunityAnalysis,
  realTime: RealTimeROI
): Promise<ClientFacingROI> {
  const openGaps = input.gaps.filter((g) => g.status !== "resolved");
  const recommendations = buildRecommendations(openGaps);
  const confidenceScore = computeConfidenceScore(input);
  const template = buildExecutiveSummaryTemplate(
    input.clientName,
    opportunity,
    realTime,
    recommendations
  );
  const executiveSummary = await maybeEnhanceExecutiveSummary(template, input.clientName);
  const charts = buildCharts(input.audits, opportunity, realTime, input.gaps);

  return {
    executiveSummary,
    charts,
    recommendations,
    confidenceScore,
  };
}

export async function buildPredictiveROI(input: PredictiveROIInput): Promise<PredictiveROI> {
  const conversionRate = input.conversionRate ?? DEFAULT_CONVERSION_RATE;
  const opportunityAnalysis = buildOpportunityAnalysis(input.audits, input.gaps, conversionRate);
  const realTimeROI = buildRealTimeROI(input, opportunityAnalysis, conversionRate);
  const clientFacing = await buildClientFacing(input, opportunityAnalysis, realTimeROI);

  return {
    clientId: input.clientId,
    clientName: input.clientName,
    monthlyRetainer: input.monthlyRetainer ?? DEFAULT_MONTHLY_RETAINER,
    lastUpdated: new Date().toISOString(),
    opportunityAnalysis,
    realTimeROI,
    clientFacing,
  };
}

export function toClientPortalROI(roi: PredictiveROI): ClientPortalROI {
  return {
    opportunityAnalysis: roi.opportunityAnalysis,
    realTimeROI: {
      valueDelivered: roi.realTimeROI.valueDelivered,
      projectedMonthlyValue: roi.realTimeROI.projectedMonthlyValue,
      improvementRate: roi.realTimeROI.improvementRate,
    },
    clientFacing: roi.clientFacing,
    lastUpdated: roi.lastUpdated,
  };
}

export async function fetchPredictiveROIForClient(clientId: string, clientName: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      audits: { orderBy: { createdAt: "desc" }, take: 12 },
      gaps: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          layer: true,
          severity: true,
          title: true,
          description: true,
          suggestedTimeline: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      fixPipelineRuns: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          status: true,
          pipelineType: true,
          createdAt: true,
          completedAt: true,
        },
      },
      actionPlans: { select: { status: true, description: true } },
    },
  });

  if (!client) return null;

  return buildPredictiveROI({
    clientId: client.id,
    clientName,
    audits: client.audits,
    gaps: client.gaps,
    pipelineRuns: client.fixPipelineRuns,
    actions: client.actionPlans,
  });
}
