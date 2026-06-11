import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isCronApiPath } from "@/lib/api-protection/config";

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

/** Lightweight check for middleware — does not hit the database. */
export function hasApiAuthSignal(request: NextRequest): boolean {
  if (isCronApiPath(request.nextUrl.pathname) && matchesCronSecret(request)) {
    return true;
  }

  const cookie =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;
  if (cookie) return true;

  const bearer = extractBearerToken(request);
  if (!bearer) return false;
  if (matchesInternalApiKey(bearer)) return true;
  return bearer.startsWith("aiso_");
}

/** Edge-safe API auth — no Prisma imports (safe for middleware). */
export async function validateApiAuthAtEdge(
  request: NextRequest
): Promise<boolean> {
  if (isCronApiPath(request.nextUrl.pathname) && matchesCronSecret(request)) {
    return true;
  }

  const bearer = extractBearerToken(request);
  if (bearer) {
    if (matchesInternalApiKey(bearer)) return true;
    if (bearer.startsWith("aiso_")) return true;
  }

  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) return false;

  const token = await getToken({ req: request, secret });
  return Boolean(token?.sub);
}
