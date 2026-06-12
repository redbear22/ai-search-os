import { prisma } from "@/lib/prisma";

const FREE_AUDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const FREE_AUDIT_REDIS_PREFIX = "free-audit:used:";

type RedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, opts?: { ex: number }) => Promise<unknown>;
};

let redisClient: RedisClient | null | undefined;

async function getRedis(): Promise<RedisClient | null> {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redisClient = null;
    return null;
  }

  try {
    const { Redis } = await import("@upstash/redis");
    redisClient = new Redis({ url, token }) as RedisClient;
  } catch (error) {
    console.warn("[abuse-tracking] Upstash Redis unavailable:", error);
    redisClient = null;
  }

  return redisClient;
}

/** Edge-safe check — Redis first; Prisma fallback only in Node routes. */
export async function hasRecentFreeAudit(
  ip: string,
  options?: { edge?: boolean }
): Promise<boolean> {
  const redis = await getRedis();
  if (redis) {
    try {
      const cached = await redis.get(`${FREE_AUDIT_REDIS_PREFIX}${ip}`);
      if (cached) return true;
    } catch (error) {
      console.warn("[abuse-tracking] Upstash get failed, skipping Redis check", error);
      redisClient = null;
    }
  }

  if (options?.edge) return false;

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

export async function markFreeAuditUsed(ip: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    await redis.set(`${FREE_AUDIT_REDIS_PREFIX}${ip}`, "1", {
      ex: Math.floor(FREE_AUDIT_WINDOW_MS / 1000),
    });
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
