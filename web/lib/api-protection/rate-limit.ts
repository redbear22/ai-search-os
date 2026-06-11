import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { IP_RATE_LIMIT_PER_HOUR, isCriticalApiPath } from "@/lib/api-protection/config";
import { isProductionSecurityEnabled } from "@/lib/api-protection/dev";

type MemoryBucket = { timestamps: number[] };

const memoryBuckets = new Map<string, MemoryBucket>();
const WINDOW_MS = 60 * 60 * 1000;

let upstashLimiter: {
  limit: (key: string) => Promise<{ success: boolean; reset: number }>;
} | null = null;

async function getUpstashLimiter(): Promise<typeof upstashLimiter> {
  if (upstashLimiter !== null) return upstashLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    upstashLimiter = null;
    return null;
  }

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token });
    upstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(IP_RATE_LIMIT_PER_HOUR, "1 h"),
      prefix: "aiso:api:ip",
      analytics: true,
    });
  } catch (error) {
    console.warn("[api-protection] Upstash rate limit unavailable:", error);
    upstashLimiter = null;
  }

  return upstashLimiter;
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

function checkMemoryRateLimit(key: string): NextResponse | null {
  const now = Date.now();
  let bucket = memoryBuckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    memoryBuckets.set(key, bucket);
  }

  const cutoff = now - WINDOW_MS;
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= IP_RATE_LIMIT_PER_HOUR) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfter = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    return NextResponse.json(
      {
        error: `Rate limit exceeded (${IP_RATE_LIMIT_PER_HOUR} requests per hour per IP)`,
        code: "rate_limited",
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, retryAfter)) },
      }
    );
  }

  bucket.timestamps.push(now);
  return null;
}

export async function checkIpRateLimit(
  request: NextRequest,
  options?: { criticalOnly?: boolean }
): Promise<NextResponse | null> {
  if (!isProductionSecurityEnabled()) return null;

  const pathname = request.nextUrl.pathname;
  if (options?.criticalOnly && !isCriticalApiPath(pathname)) {
    return null;
  }

  const ip = getClientIp(request);
  const key = `ip:${ip}`;

  const limiter = await getUpstashLimiter();
  if (limiter) {
    const result = await limiter.limit(key);
    if (!result.success) {
      const retryAfter = Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000)
      );
      return NextResponse.json(
        {
          error: `Rate limit exceeded (${IP_RATE_LIMIT_PER_HOUR} requests per hour per IP)`,
          code: "rate_limited",
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }
    return null;
  }

  return checkMemoryRateLimit(key);
}

export function resetRateLimitForTesting(key?: string): void {
  if (key) {
    memoryBuckets.delete(key);
  } else {
    memoryBuckets.clear();
  }
}
