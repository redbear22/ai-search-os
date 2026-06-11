import type { NextRequest } from "next/server";
import { fetchPredictiveROIForClient } from "@/lib/predictive-roi";
import { requireScope } from "@/lib/api-v1/auth";
import { apiV1Error, apiV1Success } from "@/lib/api-v1/response";
import { withApiV1, requireAgencyClient } from "@/lib/api-v1/handler";
import { prisma } from "@/lib/prisma";

export const GET = withApiV1(async (request: NextRequest, _context, auth) => {
  const scopeError = requireScope(auth, "insights:read");
  if (scopeError) return scopeError;

  const clientId = request.nextUrl.searchParams.get("clientId");

  if (clientId) {
    const client = await requireAgencyClient(auth.agencyId, clientId);
    if (client instanceof Response) return client;

    const roi = await fetchPredictiveROIForClient(clientId, client.name);
    if (!roi) {
      return apiV1Error("not_found", "Client not found", 404);
    }

    return apiV1Success({ clientId, predictions: roi });
  }

  const clients = await prisma.client.findMany({
    where: { agencyId: auth.agencyId },
    select: { id: true, name: true },
    take: 20,
  });

  const predictions = await Promise.all(
    clients.map(async (c) => ({
      clientId: c.id,
      clientName: c.name,
      predictions: await fetchPredictiveROIForClient(c.id, c.name),
    }))
  );

  return apiV1Success({
    agencyId: auth.agencyId,
    clients: predictions.filter((p) => p.predictions !== null),
  });
});
