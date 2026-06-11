import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hashSecret } from "@/lib/api-v1/crypto";
import { apiV1Error } from "@/lib/api-v1/response";
import { prisma } from "@/lib/prisma";
import type { ApiKeyScope, ApiV1AuthContext } from "@/types/api-v1";

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

type OAuthTokenEntry = {
  agencyId: string;
  oauthClientId: string;
  scopes: ApiKeyScope[];
  expiresAt: number;
};

const oauthTokenCache = new Map<string, OAuthTokenEntry>();

export function storeOAuthToken(
  token: string,
  entry: Omit<OAuthTokenEntry, "expiresAt"> & { expiresInSeconds: number }
): void {
  oauthTokenCache.set(token, {
    agencyId: entry.agencyId,
    oauthClientId: entry.oauthClientId,
    scopes: entry.scopes,
    expiresAt: Date.now() + entry.expiresInSeconds * 1000,
  });
}

function parseScopes(raw: string): ApiKeyScope[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
      return parsed as ApiKeyScope[];
    }
  } catch {
    // fall through
  }
  return DEFAULT_SCOPES;
}

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim() || null;
  }
  const apiKeyHeader = request.headers.get("x-api-key")?.trim();
  return apiKeyHeader || null;
}

export async function requireEnterprisePlan(
  agencyId: string
): Promise<NextResponse | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { agencyId },
    select: { plan: true, status: true },
  });

  if (!subscription || subscription.plan !== "ENTERPRISE") {
    return apiV1Error(
      "plan_required",
      "Enterprise plan required for API v1 access",
      403
    );
  }

  if (subscription.status !== "active") {
    return apiV1Error("forbidden", "Subscription is not active", 403);
  }

  return null;
}

async function authenticateApiKey(
  token: string
): Promise<ApiV1AuthContext | NextResponse> {
  const keyHash = hashSecret(token);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      agencyId: true,
      scopes: true,
      expiresAt: true,
    },
  });

  if (!apiKey) {
    return apiV1Error("unauthorized", "Invalid API key", 401);
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return apiV1Error("unauthorized", "API key expired", 401);
  }

  void prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return {
    agencyId: apiKey.agencyId,
    apiKeyId: apiKey.id,
    scopes: parseScopes(apiKey.scopes),
  };
}

function authenticateOAuthToken(token: string): ApiV1AuthContext | NextResponse {
  const entry = oauthTokenCache.get(token);
  if (!entry) {
    return apiV1Error("unauthorized", "Invalid or expired OAuth token", 401);
  }

  if (entry.expiresAt < Date.now()) {
    oauthTokenCache.delete(token);
    return apiV1Error("unauthorized", "OAuth token expired", 401);
  }

  return {
    agencyId: entry.agencyId,
    oauthClientId: entry.oauthClientId,
    scopes: entry.scopes,
  };
}

export async function authenticateApiRequest(
  request: NextRequest
): Promise<ApiV1AuthContext | NextResponse> {
  const token = extractBearerToken(request);
  if (!token) {
    return apiV1Error(
      "unauthorized",
      "Missing API key or Bearer token. Use Authorization: Bearer <key> or X-API-Key header.",
      401
    );
  }

  if (token.startsWith("aiso_")) {
    return authenticateApiKey(token);
  }

  return authenticateOAuthToken(token);
}

export function hasScope(auth: ApiV1AuthContext, scope: ApiKeyScope): boolean {
  return auth.scopes.includes(scope);
}

export function requireScope(
  auth: ApiV1AuthContext,
  scope: ApiKeyScope
): NextResponse | null {
  if (!hasScope(auth, scope)) {
    return apiV1Error("forbidden", `Missing required scope: ${scope}`, 403);
  }
  return null;
}
