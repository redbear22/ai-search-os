import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { hashSecret } from "@/lib/api-v1/crypto";
import { prisma } from "@/lib/prisma";
import type { ApiAuthType } from "@/lib/api-protection/access-log-edge";
import { isCronApiPath } from "@/lib/api-protection/config";

export type ApiAuthContext = {
  authType: ApiAuthType;
  userId?: string;
  agencyId?: string;
  apiKeyId?: string;
  isEnterprise?: boolean;
};

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim() || null;
  }
  return request.headers.get("x-api-key")?.trim() || null;
}

function matchesInternalApiKey(token: string): boolean {
  const internal = process.env.INTERNAL_API_KEY?.trim();
  return Boolean(internal && token === internal);
}

function matchesCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim();
  if (!auth?.toLowerCase().startsWith("bearer ")) return false;
  return auth.slice(7).trim() === secret;
}

async function authenticateApiKeyToken(
  token: string
): Promise<ApiAuthContext | NextResponse> {
  if (!token.startsWith("aiso_")) {
    return NextResponse.json({ error: "Invalid API key format" }, { status: 401 });
  }

  const keyHash = hashSecret(token);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      agencyId: true,
      expiresAt: true,
      agency: {
        select: {
          subscription: { select: { plan: true, status: true } },
        },
      },
    },
  });

  if (!apiKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return NextResponse.json({ error: "API key expired" }, { status: 401 });
  }

  void prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  const plan = apiKey.agency.subscription?.plan;
  const status = apiKey.agency.subscription?.status;

  return {
    authType: "api_key",
    agencyId: apiKey.agencyId,
    apiKeyId: apiKey.id,
    isEnterprise: plan === "ENTERPRISE" && status === "active",
  };
}

export async function authorizeApiRequest(
  request: NextRequest
): Promise<ApiAuthContext | NextResponse> {
  if (isCronApiPath(request.nextUrl.pathname) && matchesCronSecret(request)) {
    return { authType: "cron" };
  }

  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (secret) {
    const token = await getToken({ req: request, secret });
    if (token?.sub) {
      return {
        authType: "session",
        userId: token.sub,
        agencyId: typeof token.agencyId === "string" ? token.agencyId : undefined,
      };
    }
  }

  const bearer = extractBearerToken(request);
  if (bearer) {
    if (matchesInternalApiKey(bearer)) {
      return { authType: "internal" };
    }
    if (bearer.startsWith("aiso_")) {
      return authenticateApiKeyToken(bearer);
    }
  }

  return NextResponse.json(
    {
      error:
        "Unauthorized. Provide a session cookie, Authorization: Bearer <api-key>, or X-API-Key header.",
      code: "unauthorized",
    },
    { status: 401 }
  );
}

export {
  hasApiAuthSignal,
  validateApiAuthAtEdge,
} from "@/lib/api-protection/auth-edge";
