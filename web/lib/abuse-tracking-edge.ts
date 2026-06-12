import { Redis } from "@upstash/redis/cloudflare";

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
    redisClient = new Redis({ url, token }) as RedisClient;
  } catch (error) {
    console.warn("[abuse-tracking] Upstash Redis unavailable:", error);
    redisClient = null;
  }

  return redisClient;
}

/** Edge-safe Redis-only check for middleware. */
export async function hasRecentFreeAudit(ip: string): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;

  try {
    const cached = await redis.get(`${FREE_AUDIT_REDIS_PREFIX}${ip}`);
    return cached != null;
  } catch (error) {
    console.warn("[abuse-tracking] Upstash get failed, skipping Redis check", error);
    redisClient = null;
    return false;
  }
}

export async function markFreeAuditUsed(ip: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  await redis.set(`${FREE_AUDIT_REDIS_PREFIX}${ip}`, "1", {
    ex: Math.floor(FREE_AUDIT_WINDOW_MS / 1000),
  });
}
