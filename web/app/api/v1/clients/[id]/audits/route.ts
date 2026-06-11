import type { NextRequest } from "next/server";
import { requireScope } from "@/lib/api-v1/auth";
import { apiV1Success } from "@/lib/api-v1/response";
import { withApiV1, requireAgencyClient } from "@/lib/api-v1/handler";
import { prisma } from "@/lib/prisma";

export const GET = withApiV1(async (_request: NextRequest, context, auth) => {
  const scopeError = requireScope(auth, "audits:read");
  if (scopeError) return scopeError;

  const { id: clientId } = await context.params;
  const client = await requireAgencyClient(auth.agencyId, clientId);
  if (client instanceof Response) return client;

  const [audits, runs] = await Promise.all([
    prisma.audit.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        brandName: true,
        domain: true,
        gapCount: true,
        createdAt: true,
      },
    }),
    prisma.autonomousAuditRun.findMany({
      where: { clientId },
      orderBy: { startedAt: "desc" },
      take: 50,
      select: {
        id: true,
        triggerType: true,
        status: true,
        gapsDetected: true,
        auditId: true,
        startedAt: true,
        completedAt: true,
        errorMessage: true,
      },
    }),
  ]);

  return apiV1Success({
    clientId,
    audits: audits.map((a) => ({
      id: a.id,
      brandName: a.brandName,
      domain: a.domain,
      gapCount: a.gapCount,
      createdAt: a.createdAt.toISOString(),
    })),
    runs: runs.map((r) => ({
      id: r.id,
      triggerType: r.triggerType,
      status: r.status,
      gapsDetected: r.gapsDetected,
      auditId: r.auditId,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      errorMessage: r.errorMessage,
    })),
  });
});

export const POST = withApiV1(async (_request: NextRequest, context, auth) => {
  const scopeError = requireScope(auth, "audits:write");
  if (scopeError) return scopeError;

  const { id: clientId } = await context.params;
  const client = await requireAgencyClient(auth.agencyId, clientId);
  if (client instanceof Response) return client;

  const { runAutonomousAudit } = await import("@/lib/autonomous-audit-engine");

  const run = await prisma.autonomousAuditRun.create({
    data: { clientId, triggerType: "webhook", status: "pending" },
  });

  void runAutonomousAudit(clientId, "webhook", { existingRunId: run.id }).catch(
    async (error) => {
      await prisma.autonomousAuditRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        },
      });
    }
  );

  return apiV1Success(
    { runId: run.id, status: "queued" as const },
    undefined,
    202
  );
});
