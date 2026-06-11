import { NextResponse } from "next/server";
import { generateWebhookSecret } from "@/lib/autonomous-audit-engine";
import { frequencyToDays } from "@/lib/autonomous-audit-intelligence";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";
import type { AuditFrequency, AutonomousAuditConfigView } from "@/types/autonomous-audit";

type RouteContext = { params: Promise<{ clientId: string }> };

function parseFrequency(value: string | undefined): AuditFrequency {
  if (value === "biweekly" || value === "monthly") return value;
  return "weekly";
}

function toConfigView(
  config: NonNullable<Awaited<ReturnType<typeof loadConfig>>>,
  baseUrl: string
): AutonomousAuditConfigView {
  return {
    enabled: config.enabled,
    auditFrequency: parseFrequency(config.auditFrequency),
    optimizedFrequency: config.optimizedFrequency
      ? parseFrequency(config.optimizedFrequency)
      : null,
    nextAuditAt: config.nextAuditAt?.toISOString() ?? null,
    lastAuditAt: config.lastAuditAt?.toISOString() ?? null,
    triggers: {
      citationSpike: config.triggerCitationSpike,
      platformRelease: config.triggerPlatformRelease,
      domainChange: config.triggerDomainChange,
      webhook: config.triggerWebhook,
    },
    autoAssign: config.autoAssign,
    notifyClient: config.notifyClient,
    webhookUrl: config.webhookSecret
      ? `${baseUrl}/api/agency/autonomous-audit/webhook?clientId=${config.clientId}&secret=${config.webhookSecret}`
      : null,
  };
}

async function loadConfig(clientId: string) {
  return prisma.autonomousAuditConfig.findUnique({ where: { clientId } });
}

export async function GET(request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({ clientId });
  if (access instanceof NextResponse) return access;

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: access.agencyId },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  let config = await loadConfig(clientId);
  if (!config) {
    config = await prisma.autonomousAuditConfig.create({
      data: { clientId, webhookSecret: generateWebhookSecret() },
    });
  }

  const runs = await prisma.autonomousAuditRun.findMany({
    where: { clientId },
    orderBy: { startedAt: "desc" },
    take: 10,
  });

  const baseUrl = new URL(request.url).origin;

  return NextResponse.json({
    config: toConfigView(config, baseUrl),
    recentRuns: runs.map((run) => ({
      id: run.id,
      triggerType: run.triggerType,
      status: run.status,
      gapsDetected: run.gapsDetected,
      gapsAssigned: run.gapsAssigned,
      notifiedClient: run.notifiedClient,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      intelligence: run.intelligence,
    })),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({ clientId, permission: "manage_clients" });
  if (access instanceof NextResponse) return access;

  let body: Partial<{
    enabled: boolean;
    auditFrequency: string;
    triggers: Partial<AutonomousAuditConfigView["triggers"]>;
    autoAssign: boolean;
    notifyClient: boolean;
  }>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const frequency = body.auditFrequency
    ? parseFrequency(body.auditFrequency)
    : undefined;

  const nextAuditAt =
    body.enabled === true || frequency
      ? (() => {
          const d = new Date();
          d.setDate(d.getDate() + frequencyToDays(frequency ?? "weekly"));
          return d;
        })()
      : undefined;

  const config = await prisma.autonomousAuditConfig.upsert({
    where: { clientId },
    create: {
      clientId,
      enabled: body.enabled ?? false,
      auditFrequency: frequency ?? "weekly",
      nextAuditAt: body.enabled ? nextAuditAt : null,
      triggerCitationSpike: body.triggers?.citationSpike ?? true,
      triggerPlatformRelease: body.triggers?.platformRelease ?? true,
      triggerDomainChange: body.triggers?.domainChange ?? true,
      triggerWebhook: body.triggers?.webhook ?? true,
      autoAssign: body.autoAssign ?? true,
      notifyClient: body.notifyClient ?? false,
      webhookSecret: generateWebhookSecret(),
    },
    update: {
      ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
      ...(frequency ? { auditFrequency: frequency } : {}),
      ...(nextAuditAt && body.enabled !== false ? { nextAuditAt } : {}),
      ...(body.triggers?.citationSpike !== undefined
        ? { triggerCitationSpike: body.triggers.citationSpike }
        : {}),
      ...(body.triggers?.platformRelease !== undefined
        ? { triggerPlatformRelease: body.triggers.platformRelease }
        : {}),
      ...(body.triggers?.domainChange !== undefined
        ? { triggerDomainChange: body.triggers.domainChange }
        : {}),
      ...(body.triggers?.webhook !== undefined
        ? { triggerWebhook: body.triggers.webhook }
        : {}),
      ...(body.autoAssign !== undefined ? { autoAssign: body.autoAssign } : {}),
      ...(body.notifyClient !== undefined ? { notifyClient: body.notifyClient } : {}),
    },
  });

  const baseUrl = new URL(request.url).origin;
  return NextResponse.json({ config: toConfigView(config, baseUrl) });
}
