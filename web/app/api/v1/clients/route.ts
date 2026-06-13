import type { NextRequest } from "next/server";
import { requireScope } from "@/lib/api-v1/auth";
import { apiV1Error, apiV1Success } from "@/lib/api-v1/response";
import { withApiV1, parseJsonBody } from "@/lib/api-v1/handler";
import { shouldBypassSubscriptionLimits } from "@/lib/resolve-effective-tier";
import { generateClientAccessKey } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import type { ApiV1AuthContext } from "@/types/api-v1";

export const GET = withApiV1(async (_request, _context, auth) => {
  const scopeError = requireScope(auth, "clients:read");
  if (scopeError) return scopeError;

  const clients = await prisma.client.findMany({
    where: { agencyId: auth.agencyId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      domain: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return apiV1Success(
    clients.map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))
  );
});

export const POST = withApiV1(async (request: NextRequest, _context, auth: ApiV1AuthContext) => {
  const scopeError = requireScope(auth, "clients:write");
  if (scopeError) return scopeError;

  const body = await parseJsonBody<{ name?: string; domain?: string }>(request);
  if (body instanceof Response) return body;

  const name = body.name?.trim();
  if (!name) {
    return apiV1Error("validation_error", "name is required", 400);
  }

  const subscription = await prisma.subscription.findUnique({
    where: { agencyId: auth.agencyId },
    select: { clientLimit: true },
  });

  const clientCount = await prisma.client.count({
    where: { agencyId: auth.agencyId },
  });

  const limit = subscription?.clientLimit ?? 1;
  const bypassLimits = await shouldBypassSubscriptionLimits({
    agencyId: auth.agencyId,
  });
  if (!bypassLimits && clientCount >= limit) {
    return apiV1Error("forbidden", `Client limit reached (${limit})`, 403);
  }

  const client = await prisma.client.create({
    data: {
      name,
      domain: body.domain?.trim() || null,
      agencyId: auth.agencyId,
      settings: {
        create: { clientAccessKey: generateClientAccessKey() },
      },
    },
    select: {
      id: true,
      name: true,
      domain: true,
      createdAt: true,
    },
  });

  return apiV1Success(
    {
      id: client.id,
      name: client.name,
      domain: client.domain,
      createdAt: client.createdAt.toISOString(),
    },
    undefined,
    201
  );
});
