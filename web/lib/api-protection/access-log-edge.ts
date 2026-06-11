import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/api-protection/rate-limit";

export type ApiAuthType =
  | "session"
  | "api_key"
  | "internal"
  | "cron"
  | "anonymous";

export type ApiAccessLogInput = {
  request: NextRequest;
  authType: ApiAuthType;
  status: number;
  userId?: string | null;
  agencyId?: string | null;
  apiKeyId?: string | null;
  durationMs?: number;
};

export function logApiAccessStructured(input: ApiAccessLogInput): void {
  const entry = {
    ts: new Date().toISOString(),
    ip: getClientIp(input.request),
    method: input.request.method,
    path: input.request.nextUrl.pathname,
    status: input.status,
    authType: input.authType,
    userId: input.userId ?? null,
    agencyId: input.agencyId ?? null,
    apiKeyId: input.apiKeyId ?? null,
    userAgent: input.request.headers.get("user-agent"),
    durationMs: input.durationMs ?? null,
  };
  console.info("[api-access]", JSON.stringify(entry));
}
