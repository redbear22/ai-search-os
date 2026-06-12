import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis/cloudflare";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  AUTHENTICATED_IP_RATE_LIMIT_PER_HOUR,
  IP_RATE_LIMIT_PER_HOUR,
  isCriticalApiPath,
} from "@/lib/api-protection/config";
import { isProductionSecurityEnabled } from "@/lib/api-protection/dev";

type MemoryBucket = { timestamps: number[] };

const memoryBuckets = new Map<string, MemoryBucket>();
const WINDOW_MS = 60 * 60 * 1000;

type UpstashLimiter = {
  limit: (key: string) => Promise<{ success: boolean; reset: number }>;
  limitPerHour: number;
};

const upstashLimiters = new Map<number, UpstashLimiter>();
let upstashDisabled = false;

function getUpstashLimiter(limitPerHour: number): UpstashLimiter | null {
  if (upstashDisabled) return null;

  const cached = upstashLimiters.get(limitPerHour);
  if (cached) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    return null;
  }

  try {
    const redis = new Redis({ url, token });
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limitPerHour, "1 h"),
      prefix: `aiso:api:${limitPerHour}`,
      analytics: true,
    });
    const wrapped: UpstashLimiter = {
      limit: (key) => limiter.limit(key),
      limitPerHour,
    };
    upstashLimiters.set(limitPerHour, wrapped);
    return wrapped;
  } catch (error) {
    console.warn("[api-protection] Upstash rate limit unavailable:", error);
    return null;
  }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

function resolveLimit(authenticated?: boolean): number {
  return authenticated
    ? AUTHENTICATED_IP_RATE_LIMIT_PER_HOUR
    : IP_RATE_LIMIT_PER_HOUR;
}

function rateLimitKey(ip: string, authenticated?: boolean): string {
  return authenticated ? `auth:${ip}` : `ip:${ip}`;
}

function rateLimitErrorResponse(
  limitPerHour: number,
  retryAfter: number
): NextResponse {
  const scope = limitPerHour === IP_RATE_LIMIT_PER_HOUR ? "per IP" : "per authenticated IP";
  return NextResponse.json(
    {
      error: `Rate limit exceeded (${limitPerHour} requests per hour ${scope})`,
      code: "rate_limited",
    },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, retryAfter)) },
    }
  );
}

function checkMemoryRateLimit(
  key: string,
  limitPerHour: number
): NextResponse | null {
  const now = Date.now();
  let bucket = memoryBuckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    memoryBuckets.set(key, bucket);
  }

  const cutoff = now - WINDOW_MS;
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= limitPerHour) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfter = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    return rateLimitErrorResponse(limitPerHour, retryAfter);
  }

  bucket.timestamps.push(now);
  return null;
}

export async function checkIpRateLimit(
  request: NextRequest,
  options?: { criticalOnly?: boolean; authenticated?: boolean }
): Promise<NextResponse | null> {
  if (!isProductionSecurityEnabled()) return null;

  const pathname = request.nextUrl.pathname;
  if (options?.criticalOnly && !isCriticalApiPath(pathname)) {
    return null;
  }

  const limitPerHour = resolveLimit(options?.authenticated);
  const ip = getClientIp(request);
  const key = rateLimitKey(ip, options?.authenticated);

  const limiter = getUpstashLimiter(limitPerHour);
  if (limiter) {
    try {
      const result = await limiter.limit(key);
      if (!result.success) {
        const retryAfter = Math.max(
          1,
          Math.ceil((result.reset - Date.now()) / 1000)
        );
        return rateLimitErrorResponse(limitPerHour, retryAfter);
      }
      return null;
    } catch (error) {
      console.warn("[rate-limit] Upstash limit failed, using memory fallback", error);
      upstashDisabled = true;
      upstashLimiters.clear();
    }
  }

  return checkMemoryRateLimit(key, limitPerHour);
}

export function resetRateLimitForTesting(key?: string): void {
  if (key) {
    memoryBuckets.delete(key);
    memoryBuckets.delete(`ip:${key}`);
    memoryBuckets.delete(`auth:${key}`);
  } else {
    memoryBuckets.clear();
  }
}
