import { prisma } from "@/lib/prisma";
import type { ApiAccessLogInput } from "@/lib/api-protection/access-log-edge";
import { getClientIp } from "@/lib/api-protection/rate-limit";

export type { ApiAccessLogInput, ApiAuthType } from "@/lib/api-protection/access-log-edge";
export { logApiAccessStructured } from "@/lib/api-protection/access-log-edge";

export async function persistApiAccessLog(input: ApiAccessLogInput): Promise<void> {
  try {
    await prisma.apiAccessLog.create({
      data: {
        ip: getClientIp(input.request),
        path: input.request.nextUrl.pathname,
        method: input.request.method,
        status: input.status,
        authType: input.authType,
        userId: input.userId ?? null,
        agencyId: input.agencyId ?? null,
        apiKeyId: input.apiKeyId ?? null,
        userAgent: input.request.headers.get("user-agent"),
        durationMs: input.durationMs ?? null,
      },
    });
  } catch (error) {
    console.warn("[api-access] failed to persist log:", error);
  }
}
