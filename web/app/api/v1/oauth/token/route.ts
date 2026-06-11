import type { NextRequest } from "next/server";
import {
  generateOAuthAccessToken,
  hashSecret,
} from "@/lib/api-v1/crypto";
import { storeOAuthToken } from "@/lib/api-v1/auth";
import { apiV1Error, apiV1Success } from "@/lib/api-v1/response";
import { prisma } from "@/lib/prisma";
import type { ApiKeyScope, OAuthTokenResponse } from "@/types/api-v1";

const TOKEN_TTL_SECONDS = 3600;

const DEFAULT_SCOPES: ApiKeyScope[] = [
  "clients:read",
  "clients:write",
  "audits:read",
  "audits:write",
  "reports:write",
  "insights:read",
  "automation:write",
  "webhooks:write",
];

function parseScopes(raw: string): ApiKeyScope[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as ApiKeyScope[];
    }
  } catch {
    // fall through
  }
  return DEFAULT_SCOPES;
}

export async function POST(request: NextRequest) {
  let body: URLSearchParams;
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    body = new URLSearchParams(await request.text());
  } else {
    try {
      const json = (await request.json()) as Record<string, string>;
      body = new URLSearchParams(json);
    } catch {
      return apiV1Error("validation_error", "Invalid request body", 400);
    }
  }

  const grantType = body.get("grant_type");
  if (grantType !== "client_credentials") {
    return apiV1Error(
      "validation_error",
      "Only client_credentials grant is supported",
      400
    );
  }

  const clientId = body.get("client_id")?.trim();
  const clientSecret = body.get("client_secret")?.trim();

  if (!clientId || !clientSecret) {
    return apiV1Error(
      "validation_error",
      "client_id and client_secret are required",
      400
    );
  }

  const oauthClient = await prisma.oAuthClient.findUnique({
    where: { clientId },
    select: {
      id: true,
      agencyId: true,
      clientSecretHash: true,
      scopes: true,
    },
  });

  if (!oauthClient || oauthClient.clientSecretHash !== hashSecret(clientSecret)) {
    return apiV1Error("unauthorized", "Invalid client credentials", 401);
  }

  const subscription = await prisma.subscription.findUnique({
    where: { agencyId: oauthClient.agencyId },
    select: { plan: true, status: true },
  });

  if (!subscription || subscription.plan !== "ENTERPRISE") {
    return apiV1Error(
      "plan_required",
      "Enterprise plan required for OAuth API access",
      403
    );
  }

  if (subscription.status !== "active") {
    return apiV1Error("forbidden", "Subscription is not active", 403);
  }

  const scopes = parseScopes(oauthClient.scopes);
  const accessToken = generateOAuthAccessToken();

  storeOAuthToken(accessToken, {
    agencyId: oauthClient.agencyId,
    oauthClientId: oauthClient.id,
    scopes,
    expiresInSeconds: TOKEN_TTL_SECONDS,
  });

  const response: OAuthTokenResponse = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: TOKEN_TTL_SECONDS,
    scope: scopes.join(" "),
  };

  return apiV1Success(response);
}
