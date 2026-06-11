import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  authenticateApiRequest,
  requireEnterprisePlan,
} from "@/lib/api-v1/auth";
import type { ApiV1AuthContext } from "@/types/api-v1";
import { checkRateLimit } from "@/lib/api-v1/rate-limit";
import { prisma } from "@/lib/prisma";
import { apiV1Error } from "@/lib/api-v1/response";
import { verifyEnterpriseSignature } from "@/lib/api-protection/signing";

type RouteContext = { params: Promise<Record<string, string>> };

type ApiV1Handler = (
  request: NextRequest,
  context: RouteContext,
  auth: ApiV1AuthContext
) => Promise<NextResponse>;

async function readBodyText(request: NextRequest): Promise<string> {
  if (request.method === "GET" || request.method === "HEAD") return "";
  try {
    return await request.clone().text();
  } catch {
    return "";
  }
}

export function withApiV1(handler: ApiV1Handler) {
  return async (
    request: NextRequest,
    context: RouteContext
  ): Promise<NextResponse> => {
    const authResult = await authenticateApiRequest(request);
    if (authResult instanceof NextResponse) return authResult;

    const enterpriseError = await requireEnterprisePlan(authResult.agencyId);
    if (enterpriseError) return enterpriseError;

    const rateLimitError = checkRateLimit(authResult);
    if (rateLimitError) return rateLimitError;

    if (authResult.apiKeyId) {
      const bodyText = await readBodyText(request);
      const sigError = await verifyEnterpriseSignature(request, bodyText);
      if (sigError) {
        return apiV1Error(
          "unauthorized",
          "Enterprise API key requests require valid X-AISO-Timestamp and X-AISO-Signature headers.",
          sigError.status
        );
      }
    }

    return handler(request, context, authResult);
  };
}

export async function requireAgencyClient(
  agencyId: string,
  clientId: string
): Promise<{ id: string; name: string; domain: string | null; agencyId: string } | NextResponse> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId },
    select: { id: true, name: true, domain: true, agencyId: true },
  });

  if (!client) {
    return apiV1Error("not_found", "Client not found", 404);
  }

  return client;
}

export async function parseJsonBody<T>(request: NextRequest): Promise<T | NextResponse> {
  try {
    return (await request.json()) as T;
  } catch {
    return apiV1Error("validation_error", "Invalid JSON body", 400);
  }
}
