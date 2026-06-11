import type { Prisma } from "@prisma/client";
import type { AuditData } from "@/lib/audit-types";
import { computeShareOfVoice } from "@/lib/checkin-snapshot";
import {
  computeAuthorityScore,
  computeClarityScore,
  computeDiscoverabilityScore,
  computeTrustScore,
  parseAuditData,
} from "@/lib/client-portal";
import type {
  AgencyHealthMetrics,
  ClientHealthDashboard,
  CompetitorBenchmarking,
  CompetitorInsight,
  PredictedIssue,
  TrendDirection,
} from "@/types/client-health";

type AuditRow = {
  auditData: Prisma.JsonValue;
  gapCount: number;
  createdAt: Date;
};

type GapRow = {
  layer: string;
  severity: string;
  title: string;
  description: string;
  suggestedTimeline: string | null;
  status: string;
};

type ActionRow = {
  status: string;
  description: string;
};

function compositeHealthScore(scores: {
  discoverability: number;
  clarity: number;
  authority: number;
  trust: number;
  shareOfVoice: number;
}): number {
  return Math.round(
    scores.discoverability * 0.2 +
      scores.clarity * 0.2 +
      scores.authority * 0.2 +
      scores.trust * 0.2 +
      scores.shareOfVoice * 0.2
  );
}

function layerScoresFromAudit(audit: AuditData) {
  return {
    discoverability: computeDiscoverabilityScore(audit),
    clarity: computeClarityScore(audit),
    authority: computeAuthorityScore(audit),
    trust: computeTrustScore(audit),
    shareOfVoice: computeShareOfVoice(audit),
  };
}

function computeTrendDirection(current: number, previous: number | null): TrendDirection {
  if (previous === null) return "stable";
  const delta = current - previous;
  if (delta >= 3) return "up";
  if (delta <= -3) return "down";
  return "stable";
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseTimelineDays(timeline: string | null): number {
  if (!timeline) return 21;
  const match = timeline.match(/(\d+)/);
  return match ? Number(match[1]) : 21;
}

function buildPredictedIssues(
  gaps: GapRow[],
  current: ReturnType<typeof layerScoresFromAudit>,
  previous: ReturnType<typeof layerScoresFromAudit> | null
): PredictedIssue[] {
  const issues: PredictedIssue[] = [];
  const now = new Date();

  for (const gap of gaps.filter((g) => g.status !== "resolved").slice(0, 5)) {
    const severityWeight =
      gap.severity === "critical" ? 0.92 : gap.severity === "high" ? 0.8 : 0.65;
    issues.push({
      confidence: Math.round(severityWeight * 100) / 100,
      issue: gap.title,
      expectedDate: addDays(now, parseTimelineDays(gap.suggestedTimeline)).toISOString(),
    });
  }

  if (previous) {
    const layers = [
      ["Discoverability", current.discoverability - previous.discoverability],
      ["Clarity", current.clarity - previous.clarity],
      ["Authority", current.authority - previous.authority],
      ["Trust", current.trust - previous.trust],
      ["Share of voice", current.shareOfVoice - previous.shareOfVoice],
    ] as const;

    for (const [label, delta] of layers) {
      if (delta <= -5) {
        issues.push({
          confidence: Math.min(0.88, 0.55 + Math.abs(delta) / 100),
          issue: `${label} may decline further without intervention`,
          expectedDate: addDays(now, 14).toISOString(),
        });
      }
    }
  }

  if (current.shareOfVoice < 25) {
    issues.push({
      confidence: 0.74,
      issue: "Competitors may capture additional AI citation share",
      expectedDate: addDays(now, 30).toISOString(),
    });
  }

  return issues
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);
}

function buildCompetitorBenchmarking(audit: AuditData | null): CompetitorBenchmarking {
  if (!audit) {
    return { clientRank: 1, topCompetitors: [], marketShare: 0 };
  }

  const clientVisibility = audit.discoverability.aso.aiVisibilityScore;
  const clientMentions = audit.discoverability.aso.brandMentions;

  const competitors: CompetitorInsight[] = audit.discoverability.competitors
    .filter((c) => c.name.trim())
    .map((c, index) => ({
      name: c.name,
      aiVisibility: c.aiVisibility,
      brandMentions: c.brandMentions,
      traffic: c.traffic,
      rank: 0,
      gapVsClient: c.aiVisibility - clientVisibility,
    }));

  const allPlayers = [
    {
      name: "Your client",
      aiVisibility: clientVisibility,
      brandMentions: clientMentions,
      traffic: audit.discoverability.seo.traffic,
      isClient: true,
    },
    ...competitors.map((c) => ({ ...c, isClient: false })),
  ].sort((a, b) => b.aiVisibility - a.aiVisibility);

  const clientRank = allPlayers.findIndex((p) => p.isClient) + 1;

  const rankedCompetitors = competitors
    .sort((a, b) => b.aiVisibility - a.aiVisibility)
    .map((c, i) => ({ ...c, rank: i + 1 }))
    .slice(0, 5);

  return {
    clientRank,
    topCompetitors: rankedCompetitors,
    marketShare: computeShareOfVoice(audit),
  };
}

function buildAgencyMetrics(
  actions: ActionRow[],
  gaps: GapRow[],
  healthScore: number,
  trend: TrendDirection
): AgencyHealthMetrics {
  const completed = actions.filter((a) => a.status === "completed");
  const totalValueCreated = completed.reduce((sum, action) => {
    const desc = action.description.toLowerCase();
    if (desc.includes("critical") || desc.includes("citation")) return sum + 4200;
    if (desc.includes("content") || desc.includes("schema")) return sum + 2800;
    return sum + 1500;
  }, 0);

  const hoursSaved = Math.round(
    completed.length * 2.5 + gaps.filter((g) => g.status !== "resolved").length * 0.5
  );

  let satisfaction = healthScore;
  if (trend === "up") satisfaction = Math.min(100, satisfaction + 8);
  if (trend === "down") satisfaction = Math.max(0, satisfaction - 10);
  satisfaction = Math.round(
    satisfaction * 0.7 + (completed.length / Math.max(actions.length, 1)) * 30
  );

  return {
    totalValueCreated,
    hoursSaved,
    clientSatisfaction: Math.min(100, Math.max(0, satisfaction)),
  };
}

export function buildClientHealthDashboard(input: {
  clientId: string;
  clientName: string;
  audits: AuditRow[];
  gaps: GapRow[];
  actions: ActionRow[];
}): ClientHealthDashboard {
  const latestAudit = input.audits[0] ? parseAuditData(input.audits[0].auditData) : null;
  const previousAudit = input.audits[1] ? parseAuditData(input.audits[1].auditData) : null;

  const currentLayers = latestAudit
    ? layerScoresFromAudit(latestAudit)
    : {
        discoverability: 0,
        clarity: 0,
        authority: 0,
        trust: 0,
        shareOfVoice: 0,
      };

  const previousLayers = previousAudit ? layerScoresFromAudit(previousAudit) : null;

  const healthScore = compositeHealthScore(currentLayers);
  const previousHealth = previousLayers ? compositeHealthScore(previousLayers) : null;
  const trendDirection = computeTrendDirection(healthScore, previousHealth);

  return {
    clientId: input.clientId,
    clientName: input.clientName,
    healthScore,
    trendDirection,
    layerScores: currentLayers,
    predictedIssues: buildPredictedIssues(input.gaps, currentLayers, previousLayers),
    competitorBenchmarking: buildCompetitorBenchmarking(latestAudit),
    agencyMetrics: buildAgencyMetrics(
      input.actions,
      input.gaps,
      healthScore,
      trendDirection
    ),
    lastUpdated: new Date().toISOString(),
  };
}
