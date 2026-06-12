import type { NextRequest } from "next/server";

type LimitResult = {
  success: boolean;
  limit: number;
  reset: number;
  remaining: number;
};

type Limiter = {
  limit: (key: string) => Promise<LimitResult>;
};

let apiLimiter: Limiter | null | undefined;
let freeAuditLimiter: Limiter | null | undefined;
let apiUpstashDisabled = false;
let freeAuditUpstashDisabled = false;

const memoryBuckets = new Map<string, number[]>();

function getClientIpFromRequest(request: Request | NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

async function createLimiter(
  prefix: string,
  requests: number,
  window: `${number} s` | `${number} h`
): Promise<Limiter | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token });
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      prefix: `aiso:${prefix}`,
      analytics: true,
    });
  } catch (error) {
    console.warn(`[rate-limit] Upstash unavailable for ${prefix}:`, error);
    return null;
  }
}

async function getApiLimiter(): Promise<Limiter | null> {
  if (apiUpstashDisabled) return null;
  if (apiLimiter !== undefined) return apiLimiter;
  apiLimiter = await createLimiter("abuse:api", 10, "60 s");
  return apiLimiter;
}

async function getFreeAuditLimiter(): Promise<Limiter | null> {
  if (freeAuditUpstashDisabled) return null;
  if (freeAuditLimiter !== undefined) return freeAuditLimiter;
  freeAuditLimiter = await createLimiter("abuse:free-audit", 1, "24 h");
  return freeAuditLimiter;
}

async function limitWithFallback(
  limiter: Limiter,
  key: string,
  disableUpstash: () => void,
  memoryFallback: () => LimitResult
): Promise<LimitResult> {
  try {
    return await limiter.limit(key);
  } catch (error) {
    console.warn("[rate-limit] Upstash limit failed, using memory fallback", error);
    disableUpstash();
    return memoryFallback();
  }
}

function memoryLimit(
  key: string,
  requests: number,
  windowMs: number
): LimitResult {
  const now = Date.now();
  const bucket = memoryBuckets.get(key) ?? [];
  const active = bucket.filter((t) => t > now - windowMs);
  const success = active.length < requests;

  if (success) {
    active.push(now);
    memoryBuckets.set(key, active);
  }

  const oldest = active[0] ?? now;
  return {
    success,
    limit: requests,
    reset: oldest + windowMs,
    remaining: Math.max(0, requests - active.length),
  };
}

export async function rateLimitByIp(request: Request): Promise<LimitResult> {
  const ip = getClientIpFromRequest(request);
  const limiter = await getApiLimiter();
  if (limiter) {
    return limitWithFallback(
      limiter,
      ip,
      () => {
        apiUpstashDisabled = true;
        apiLimiter = null;
      },
      () => memoryLimit(`api:${ip}`, 10, 60_000)
    );
  }
  return memoryLimit(`api:${ip}`, 10, 60_000);
}

export async function canRunFreeAudit(ip: string): Promise<LimitResult> {
  const limiter = await getFreeAuditLimiter();
  if (limiter) {
    return limitWithFallback(
      limiter,
      `free-audit:${ip}`,
      () => {
        freeAuditUpstashDisabled = true;
        freeAuditLimiter = null;
      },
      () => memoryLimit(`free-audit:${ip}`, 1, 24 * 60 * 60 * 1000)
    );
  }
  return memoryLimit(`free-audit:${ip}`, 1, 24 * 60 * 60 * 1000);
}

export function resetAbuseRateLimitForTesting(key?: string): void {
  apiUpstashDisabled = false;
  freeAuditUpstashDisabled = false;
  apiLimiter = undefined;
  freeAuditLimiter = undefined;
  if (key) {
    memoryBuckets.delete(key);
    memoryBuckets.delete(`api:${key}`);
    memoryBuckets.delete(`free-audit:${key}`);
  } else {
    memoryBuckets.clear();
  }
}
