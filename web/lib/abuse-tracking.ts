import "server-only";

import { prisma } from "@/lib/prisma";
import {
  hasRecentFreeAudit as hasRecentFreeAuditRedis,
  markFreeAuditUsed,
} from "@/lib/abuse-tracking-edge";

export { markFreeAuditUsed };

const FREE_AUDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Node route check — Redis first, Prisma fallback when Redis misses. */
export async function hasRecentFreeAudit(ip: string): Promise<boolean> {
  if (await hasRecentFreeAuditRedis(ip)) return true;

  try {
    const since = new Date(Date.now() - FREE_AUDIT_WINDOW_MS);
    const row = await prisma.abuseTracking.findFirst({
      where: {
        ipAddress: ip,
        action: "free_audit",
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    return row != null;
  } catch {
    return false;
  }
}

export async function trackAbuseEvent(
  ip: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.abuseTracking.create({
      data: {
        ipAddress: ip,
        action,
        metadata: metadata ?? {},
      },
    });
  } catch (error) {
    console.error("[abuse-tracking] failed to persist event:", error);
  }
}
