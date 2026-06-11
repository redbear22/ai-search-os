import type { Gap } from "@/types/gap";
import type { AuditFrequency, AutonomousIntelligence } from "@/types/autonomous-audit";

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

const LAYER_WEIGHT: Record<string, number> = {
  discoverability: 1.1,
  clarity: 1.05,
  authority: 1.15,
  trust: 1.0,
};

export function gapPatternKey(gap: Gap): string {
  return `${gap.layer}:${gap.severity}:${gap.title.slice(0, 40).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

export function prioritizeGapsByImpact(
  gaps: Gap[],
  learningRates: Map<string, number>
): Array<Gap & { impactScore: number; predictedValue: number }> {
  return gaps
    .map((gap) => {
      const base = (SEVERITY_WEIGHT[gap.severity] ?? 40) * (LAYER_WEIGHT[gap.layer] ?? 1);
      const learnBoost = (learningRates.get(gapPatternKey(gap)) ?? 0.5) * 20;
      const impactScore = Math.round(base + learnBoost);
      const predictedValue = Math.round(impactScore * (gap.suggestedTimeline <= 4 ? 1.2 : 1));
      return { ...gap, impactScore, predictedValue };
    })
    .sort((a, b) => b.impactScore - a.impactScore);
}

export function optimizeAuditFrequency(input: {
  current: AuditFrequency;
  gapsPerRun: number[];
  criticalCount: number;
  /** Network-derived optimal interval in days (from competitive intelligence) */
  networkOptimalDays?: number;
}): AuditFrequency {
  const avgGaps =
    input.gapsPerRun.length > 0
      ? input.gapsPerRun.reduce((a, b) => a + b, 0) / input.gapsPerRun.length
      : 0;

  let frequency: AuditFrequency;
  if (input.criticalCount >= 2 || avgGaps >= 8) frequency = "weekly";
  else if (avgGaps >= 4) frequency = "biweekly";
  else frequency = input.current === "weekly" ? "biweekly" : "monthly";

  if (input.networkOptimalDays !== undefined && input.networkOptimalDays > 0) {
    if (input.networkOptimalDays <= 7) return "weekly";
    if (input.networkOptimalDays <= 14) return frequency === "monthly" ? "biweekly" : frequency;
  }

  return frequency;
}

export function frequencyToDays(frequency: AuditFrequency): number {
  if (frequency === "weekly") return 7;
  if (frequency === "biweekly") return 14;
  return 30;
}

export function buildIntelligenceSummary(
  prioritized: Array<{ title: string; impactScore: number }>,
  fixPatterns: { pattern: string; successRate: number }[],
  recommendedFrequency: AuditFrequency
): AutonomousIntelligence {
  return {
    topPredictedGaps: prioritized.slice(0, 5).map((g) => g.title),
    recommendedFrequency,
    fixPatterns: fixPatterns.slice(0, 5),
  };
}

type GapFixLearningDb = {
  gapFixLearning: {
    findMany: (
      args: Parameters<
        import("@prisma/client").PrismaClient["gapFixLearning"]["findMany"]
      >[0]
    ) => ReturnType<
      import("@prisma/client").PrismaClient["gapFixLearning"]["findMany"]
    >;
  };
};

export async function loadLearningRates(
  agencyId: string,
  prisma: GapFixLearningDb
): Promise<Map<string, number>> {
  const rows = await prisma.gapFixLearning.findMany({
    where: { agencyId },
    select: { patternKey: true, successRate: true },
  });
  return new Map(rows.map((r) => [r.patternKey, r.successRate]));
}

type GapFixLearningWriteDb = GapFixLearningDb & {
  gapFixLearning: GapFixLearningDb["gapFixLearning"] & {
    findUnique: (
      args: Parameters<
        import("@prisma/client").PrismaClient["gapFixLearning"]["findUnique"]
      >[0]
    ) => ReturnType<
      import("@prisma/client").PrismaClient["gapFixLearning"]["findUnique"]
    >;
    upsert: (
      args: Parameters<
        import("@prisma/client").PrismaClient["gapFixLearning"]["upsert"]
      >[0]
    ) => ReturnType<
      import("@prisma/client").PrismaClient["gapFixLearning"]["upsert"]
    >;
  };
};

export async function recordFixOutcome(
  agencyId: string,
  gap: Gap,
  succeeded: boolean,
  prisma: GapFixLearningWriteDb
): Promise<void> {
  const patternKey = gapPatternKey(gap);
  const existing = await prisma.gapFixLearning.findUnique({
    where: { agencyId_patternKey: { agencyId, patternKey } },
  });

  const attemptCount = (existing?.attemptCount ?? 0) + 1;
  const successCount = (existing?.successCount ?? 0) + (succeeded ? 1 : 0);

  await prisma.gapFixLearning.upsert({
    where: { agencyId_patternKey: { agencyId, patternKey } },
    create: {
      agencyId,
      layer: gap.layer,
      severity: gap.severity,
      patternKey,
      attemptCount: 1,
      successCount: succeeded ? 1 : 0,
      successRate: succeeded ? 1 : 0,
    },
    update: {
      attemptCount,
      successCount,
      successRate: successCount / attemptCount,
    },
  });
}
