import type { NextRequest } from "next/server";
import { requireScope } from "@/lib/api-v1/auth";
import { apiV1Error, apiV1Success } from "@/lib/api-v1/response";
import { withApiV1, requireAgencyClient } from "@/lib/api-v1/handler";
import { prisma } from "@/lib/prisma";

export const DELETE = withApiV1(async (request: NextRequest, _context, auth) => {
  const scopeError = requireScope(auth, "automation:write");
  if (scopeError) return scopeError;

  const runId = request.nextUrl.searchParams.get("runId");
  const clientId = request.nextUrl.searchParams.get("clientId");

  if (!runId && !clientId) {
    return apiV1Error(
      "validation_error",
      "Provide runId or clientId query parameter",
      400
    );
  }

  if (clientId) {
    const client = await requireAgencyClient(auth.agencyId, clientId);
    if (client instanceof Response) return client;
  }

  const where = runId
    ? {
        id: runId,
        status: { in: ["pending", "running"] as string[] },
        client: { agencyId: auth.agencyId },
      }
    : {
        clientId: clientId!,
        status: { in: ["pending", "running"] as string[] },
        client: { agencyId: auth.agencyId },
      };

  const runs = await prisma.autonomousAuditRun.findMany({
    where,
    select: { id: true },
  });

  if (runs.length === 0) {
    return apiV1Error("not_found", "No cancellable runs found", 404);
  }

  await prisma.autonomousAuditRun.updateMany({
    where: { id: { in: runs.map((r) => r.id) } },
    data: {
      status: "cancelled",
      completedAt: new Date(),
      errorMessage: "Cancelled via API v1",
    },
  });

  return apiV1Success({
    cancelled: runs.map((r) => r.id),
    count: runs.length,
  });
});
