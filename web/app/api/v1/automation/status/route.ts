import { requireScope } from "@/lib/api-v1/auth";
import { apiV1Success } from "@/lib/api-v1/response";
import { withApiV1 } from "@/lib/api-v1/handler";
import { prisma } from "@/lib/prisma";

export const GET = withApiV1(async (_request, _context, auth) => {
  const scopeError = requireScope(auth, "automation:write");
  if (scopeError) return scopeError;

  const clients = await prisma.client.findMany({
    where: { agencyId: auth.agencyId },
    select: {
      id: true,
      name: true,
      autonomousAuditConfig: {
        select: {
          enabled: true,
          auditFrequency: true,
          optimizedFrequency: true,
          nextAuditAt: true,
          lastAuditAt: true,
        },
      },
      autonomousAuditRuns: {
        where: { status: { in: ["pending", "running"] } },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          triggerType: true,
          startedAt: true,
        },
      },
    },
  });

  const automations = clients.map((c) => {
    const config = c.autonomousAuditConfig;
    const activeRun = c.autonomousAuditRuns[0] ?? null;
    let health: "healthy" | "disabled" | "overdue" | "running" | "idle" = "idle";

    if (!config?.enabled) {
      health = "disabled";
    } else if (activeRun) {
      health = "running";
    } else if (config.nextAuditAt && config.nextAuditAt < new Date()) {
      health = "overdue";
    } else if (config.enabled) {
      health = "healthy";
    }

    return {
      clientId: c.id,
      clientName: c.name,
      enabled: config?.enabled ?? false,
      frequency: config?.optimizedFrequency ?? config?.auditFrequency ?? "weekly",
      nextAuditAt: config?.nextAuditAt?.toISOString() ?? null,
      lastAuditAt: config?.lastAuditAt?.toISOString() ?? null,
      activeRun: activeRun
        ? {
            id: activeRun.id,
            status: activeRun.status,
            triggerType: activeRun.triggerType,
            startedAt: activeRun.startedAt.toISOString(),
          }
        : null,
      health,
    };
  });

  const summary = {
    total: automations.length,
    enabled: automations.filter((a) => a.enabled).length,
    healthy: automations.filter((a) => a.health === "healthy").length,
    overdue: automations.filter((a) => a.health === "overdue").length,
    running: automations.filter((a) => a.health === "running").length,
  };

  return apiV1Success({ summary, automations });
});
