/**
 * In-memory sliding-window rate limiter for API v1.
 * Production: replace with Redis-backed ApiRateLimitBucket for multi-instance deployments.
 */

import { NextResponse } from "next/server";
import { apiV1Error } from "@/lib/api-v1/response";
import type { ApiV1AuthContext } from "@/types/api-v1";

const ENTERPRISE_LIMIT = 1000;
const WINDOW_MS = 60_000;

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

function pruneBucket(bucket: Bucket, now: number): void {
  const cutoff = now - WINDOW_MS;
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
}

export function checkRateLimit(
  auth: ApiV1AuthContext
): NextResponse | null {
  const key = auth.apiKeyId ?? auth.oauthClientId ?? auth.agencyId;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  pruneBucket(bucket, now);

  if (bucket.timestamps.length >= ENTERPRISE_LIMIT) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfter = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    return apiV1Error(
      "rate_limited",
      `Rate limit exceeded (${ENTERPRISE_LIMIT} requests per minute)`,
      429,
      { "Retry-After": String(Math.max(1, retryAfter)) }
    );
  }

  bucket.timestamps.push(now);
  return null;
}

export function resetRateLimitForTesting(key?: string): void {
  if (key) {
    buckets.delete(key);
  } else {
    buckets.clear();
  }
}
