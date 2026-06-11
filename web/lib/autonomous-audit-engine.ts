import { randomBytes } from "crypto";
import type { AuditData } from "@/lib/audit-types";
import { detectGaps } from "@/lib/server/gap-detection";
import type { Gap } from "@/types/gap";
import { mapUnifiedAuditToAuditData } from "@/lib/map-unified-audit";
import { parseAuditData } from "@/lib/client-portal";
import { runUnifiedAudit } from "@/lib/unified-data-client";
import {
  buildIntelligenceSummary,
  frequencyToDays,
  loadLearningRates,
  optimizeAuditFrequency,
  prioritizeGapsByImpact,
} from "@/lib/autonomous-audit-intelligence";
import {
  getNetworkAuditFrequencyDays,
  inferIndustry,
} from "@/lib/competitive-intelligence-network";
import { prisma } from "@/lib/prisma";
import type {
  AuditFrequency,
  AuditTriggerType,
  AutonomousIntelligence,
} from "@/types/autonomous-audit";

export function generateWebhookSecret(): string {
  return randomBytes(24).toString("base64url");
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseFrequency(value: string | null | undefined): AuditFrequency {
  if (value === "biweekly" || value === "monthly") return value;
  return "weekly";
}

function competitorsFromAudit(audit: AuditData | null, domain: string | null): string[] {
  if (audit?.discoverability.competitors.length) {
    return audit.discoverability.competitors
      .map((c) => c.name)
      .filter(Boolean)
      .slice(0, 5);
  }
  return domain ? [`competitor-of-${domain}`] : ["competitor1.com"];
}

async function pickAssignee(clientId: string, agencyId: string): Promise<string | null> {
  const members = await prisma.user.findMany({
    where: {
      agencyId,
      agencyRole: { in: ["AGENCY_TEAM", "AGENCY_ADMIN", "AGENCY_OWNER"] },
      OR: [
        { agencyRole: { in: ["AGENCY_ADMIN", "AGENCY_OWNER"] } },
        { assignments: { some: { clientId } } },
      ],
    },
    select: { id: true, name: true, email: true },
  });

  if (members.length === 0) return null;

  const withLoad = await Promise.all(
    members.map(async (member) => {
      const openPlans = await prisma.actionPlan.count({
        where: {
          clientId,
          status: { not: "completed" },
          OR: [
            ...(member.name ? [{ ownerPerson: member.name }] : []),
            { ownerPerson: member.email },
          ],
        },
      });
      return { ...member, openPlans };
    })
  );

  withLoad.sort((a, b) => a.openPlans - b.openPlans);
  return withLoad[0]?.id ?? null;
}

export async function evaluateScheduledClients(): Promise<
  { clientId: string; trigger: AuditTriggerType }[]
> {
  const now = new Date();
  const configs = await prisma.autonomousAuditConfig.findMany({
    where: { enabled: true, nextAuditAt: { lte: now } },
    select: { clientId: true },
  });
  return configs.map((c) => ({ clientId: c.clientId, trigger: "schedule" }));
}

export async function evaluateEventTriggers(clientId: string): Promise<AuditTriggerType[]> {
  const config = await prisma.autonomousAuditConfig.findUnique({
    where: { clientId },
    include: {
      client: {
        include: {
          audits: { orderBy: { createdAt: "desc" }, take: 2 },
        },
      },
    },
  });

  if (!config?.enabled) return [];

  const triggers: AuditTriggerType[] = [];
  const client = config.client;
  const latest = client.audits[0] ? parseAuditData(client.audits[0].auditData) : null;
  const previous = client.audits[1] ? parseAuditData(client.audits[1].auditData) : null;

  if (config.triggerDomainChange && client.domain && config.lastKnownDomain) {
    if (client.domain !== config.lastKnownDomain) {
      triggers.push("domain_change");
    }
  }

  if (config.triggerCitationSpike && latest && previous) {
    const currentComp = latest.authority.sourcesCitingCompetitorsOnly.length;
    const prevComp = previous.authority.sourcesCitingCompetitorsOnly.length;
    const baseline = config.citationBaseline ?? prevComp;
    if (currentComp > baseline * 1.3 || currentComp - prevComp >= 3) {
      triggers.push("citation_spike");
    }
  }

  if (config.triggerPlatformRelease) {
    const pending = await prisma.platformReleaseEvent.findFirst({
      where: { processed: false },
      orderBy: { releasedAt: "desc" },
    });
    if (pending) triggers.push("platform_release");
  }

  return triggers;
}

export async function runAutonomousAudit(
  clientId: string,
  triggerType: AuditTriggerType,
  options?: { existingRunId?: string }
): Promise<{ runId: string; status: string }> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      agency: true,
      autonomousAuditConfig: true,
      audits: { orderBy: { createdAt: "desc" }, take: 2 },
      settings: true,
    },
  });

  if (!client) throw new Error("Client not found");

  const previousHealthAudit = client.audits[0]
    ? parseAuditData(client.audits[0].auditData)
    : null;

  let run;
  if (options?.existingRunId) {
    run = await prisma.autonomousAuditRun.update({
      where: { id: options.existingRunId },
      data: { status: "running", triggerType },
    });
  } else {
    run = await prisma.autonomousAuditRun.create({
      data: { clientId, triggerType, status: "running" },
    });
  }

  try {
    const lastAudit = client.audits[0] ? parseAuditData(client.audits[0].auditData) : null;
    const brandName = client.audits[0]?.brandName ?? client.name;
    const domain = client.domain ?? client.audits[0]?.domain ?? "";
    const competitors = competitorsFromAudit(lastAudit, client.domain);

    const unified = await runUnifiedAudit(brandName, domain, competitors);
    const auditData = mapUnifiedAuditToAuditData(unified, {
      brandName,
      domain,
      competitors,
    });

    const rawGaps = detectGaps(auditData);
    const learningRates = await loadLearningRates(client.agencyId, prisma);
    const prioritized = prioritizeGapsByImpact(rawGaps, learningRates);

    const audit = await prisma.audit.create({
      data: {
        clientId,
        brandName,
        domain,
        auditData: auditData as object,
        gapCount: prioritized.length,
      },
    });

    const gapCreates = await Promise.all(
      prioritized.map((gap) =>
        prisma.gap.create({
          data: {
            clientId,
            layer: gap.layer,
            severity: gap.severity,
            title: gap.title,
            description: gap.description,
            suggestedOwner: gap.suggestedOwner,
            suggestedTimeline: String(gap.suggestedTimeline),
            status: "open",
            sourceData: {
              impactScore: gap.impactScore,
              predictedValue: gap.predictedValue,
              suggestedAction: gap.suggestedAction,
            },
          },
        })
      )
    );

    let assigneeId: string | null = null;
    let gapsAssigned = 0;

    if (client.autonomousAuditConfig?.autoAssign !== false) {
      assigneeId = await pickAssignee(clientId, client.agencyId);

      for (const gap of prioritized.slice(0, 8)) {
        await prisma.actionPlan.create({
          data: {
            clientId,
            description: `${gap.title}: ${gap.suggestedAction}`,
            ownerTeam: gap.suggestedOwner.split("/")[0]?.trim() || gap.suggestedOwner,
            ownerPerson: assigneeId
              ? (
                  await prisma.user.findUnique({
                    where: { id: assigneeId },
                    select: { name: true },
                  })
                )?.name ?? undefined
              : undefined,
            dueWeek: gap.suggestedTimeline,
            status: "pending",
            layerId: gap.layer,
            sortOrder: gapsAssigned,
          },
        });
        gapsAssigned += 1;
      }
    }

    const recentRuns = await prisma.autonomousAuditRun.findMany({
      where: { clientId, status: "completed" },
      orderBy: { startedAt: "desc" },
      take: 6,
      select: { gapsDetected: true },
    });

    const criticalCount = prioritized.filter((g) => g.severity === "critical").length;
    const frequency = parseFrequency(
      client.autonomousAuditConfig?.optimizedFrequency ??
        client.autonomousAuditConfig?.auditFrequency
    );
    const clientIndustry = inferIndustry(client.domain, client.name);
    const networkOptimalDays = await getNetworkAuditFrequencyDays(
      client.agencyId,
      clientIndustry
    );
    const recommended = optimizeAuditFrequency({
      current: frequency,
      gapsPerRun: recentRuns.map((r) => r.gapsDetected),
      criticalCount,
      networkOptimalDays,
    });

    const fixPatterns = [...learningRates.entries()]
      .map(([pattern, rate]) => ({ pattern, successRate: rate }))
      .sort((a, b) => b.successRate - a.successRate);

    const intelligence: AutonomousIntelligence = buildIntelligenceSummary(
      prioritized,
      fixPatterns,
      recommended
    );

    const notifyClient =
      client.autonomousAuditConfig?.notifyClient === true &&
      client.settings?.shareWithClient === true;

    const now = new Date();
    const effectiveFrequency = recommended;

    await prisma.autonomousAuditConfig.upsert({
      where: { clientId },
      create: {
        clientId,
        enabled: true,
        lastAuditAt: now,
        nextAuditAt: addDays(now, frequencyToDays(effectiveFrequency)),
        optimizedFrequency: effectiveFrequency,
        lastKnownDomain: client.domain,
        citationBaseline: auditData.authority.sourcesCitingCompetitorsOnly.length,
        webhookSecret: generateWebhookSecret(),
      },
      update: {
        lastAuditAt: now,
        nextAuditAt: addDays(now, frequencyToDays(effectiveFrequency)),
        optimizedFrequency: effectiveFrequency,
        lastKnownDomain: client.domain,
        citationBaseline: auditData.authority.sourcesCitingCompetitorsOnly.length,
      },
    });

    if (triggerType === "platform_release") {
      await prisma.platformReleaseEvent.updateMany({
        where: { processed: false },
        data: { processed: true },
      });
    }

    await prisma.autonomousAuditRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        gapsDetected: gapCreates.length,
        gapsAssigned,
        gapsPrioritized: prioritized.slice(0, 10).map((g) => ({
          title: g.title,
          layer: g.layer,
          severity: g.severity,
          impactScore: g.impactScore,
          predictedValue: g.predictedValue,
        })),
        notifiedClient: notifyClient,
        assigneeId,
        auditId: audit.id,
        intelligence: intelligence as object,
        completedAt: now,
      },
    });

    const { dispatchWebhook } = await import("@/lib/api-v1/webhooks");
    const { buildClientHealthDashboard } = await import("@/lib/client-health");

    void dispatchWebhook(client.agencyId, "audit.completed", {
      clientId,
      runId: run.id,
      auditId: audit.id,
      gapsDetected: gapCreates.length,
      triggerType,
    });

    if (gapCreates.length > 0) {
      void dispatchWebhook(client.agencyId, "gap.detected", {
        clientId,
        runId: run.id,
        gaps: prioritized.slice(0, 10).map((g) => ({
          title: g.title,
          layer: g.layer,
          severity: g.severity,
          impactScore: g.impactScore,
        })),
        count: gapCreates.length,
      });
    }

    const healthDashboard = buildClientHealthDashboard({
      clientId,
      clientName: client.name,
      audits: [{ auditData: auditData as object, gapCount: gapCreates.length, createdAt: now }],
      gaps: prioritized.map((g) => ({
        layer: g.layer,
        severity: g.severity,
        title: g.title,
        description: g.description,
        suggestedTimeline: String(g.suggestedTimeline),
        status: "open",
      })),
      actions: [],
    });

    if (previousHealthAudit) {
      const previousDashboard = buildClientHealthDashboard({
        clientId,
        clientName: client.name,
        audits: client.audits.map((a) => ({
          auditData: a.auditData,
          gapCount: a.gapCount,
          createdAt: a.createdAt,
        })),
        gaps: [],
        actions: [],
      });
      if (previousDashboard.healthScore !== healthDashboard.healthScore) {
        void dispatchWebhook(client.agencyId, "client.health.changed", {
          clientId,
          previousScore: previousDashboard.healthScore,
          currentScore: healthDashboard.healthScore,
          trendDirection: healthDashboard.trendDirection,
        });
      }
    }

    return { runId: run.id, status: "completed" };
  } catch (error) {
    await prisma.autonomousAuditRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
    throw error;
  }
}
