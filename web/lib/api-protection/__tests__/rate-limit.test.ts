import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTHENTICATED_IP_RATE_LIMIT_PER_HOUR,
  IP_RATE_LIMIT_PER_HOUR,
} from "@/lib/api-protection/config";
import {
  checkIpRateLimit,
  getClientIp,
  resetRateLimitForTesting,
} from "@/lib/api-protection/rate-limit";

vi.mock("@/lib/api-protection/dev", () => ({
  isProductionSecurityEnabled: () => true,
}));

function makeRequest(path = "/api/audit/unified"): NextRequest {
  return {
    nextUrl: { pathname: path },
    headers: new Headers({ "x-forwarded-for": "203.0.113.10" }),
  } as NextRequest;
}

describe("checkIpRateLimit", () => {
  beforeEach(() => {
    resetRateLimitForTesting("203.0.113.10");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    resetRateLimitForTesting();
  });

  it("allows anonymous traffic under the hourly cap", async () => {
    for (let i = 0; i < IP_RATE_LIMIT_PER_HOUR; i += 1) {
      const result = await checkIpRateLimit(makeRequest(), { authenticated: false });
      expect(result).toBeNull();
    }
  });

  it("blocks anonymous traffic at 100 requests per hour", async () => {
    for (let i = 0; i < IP_RATE_LIMIT_PER_HOUR; i += 1) {
      await checkIpRateLimit(makeRequest(), { authenticated: false });
    }

    const blocked = await checkIpRateLimit(makeRequest(), { authenticated: false });
    expect(blocked?.status).toBe(429);
    const body = await blocked?.json();
    expect(body).toMatchObject({
      code: "rate_limited",
      error: expect.stringContaining(String(IP_RATE_LIMIT_PER_HOUR)),
    });
  });

  it("uses a separate higher bucket for authenticated callers", async () => {
    for (let i = 0; i < IP_RATE_LIMIT_PER_HOUR; i += 1) {
      await checkIpRateLimit(makeRequest(), { authenticated: false });
    }

    const anonymousBlocked = await checkIpRateLimit(makeRequest(), {
      authenticated: false,
    });
    expect(anonymousBlocked?.status).toBe(429);

    const authedAllowed = await checkIpRateLimit(makeRequest(), {
      authenticated: true,
    });
    expect(authedAllowed).toBeNull();
  });

  it("blocks authenticated traffic at the authenticated hourly cap", async () => {
    for (let i = 0; i < AUTHENTICATED_IP_RATE_LIMIT_PER_HOUR; i += 1) {
      await checkIpRateLimit(makeRequest(), { authenticated: true });
    }

    const blocked = await checkIpRateLimit(makeRequest(), { authenticated: true });
    expect(blocked?.status).toBe(429);
    const body = await blocked?.json();
    expect(body?.error).toContain(String(AUTHENTICATED_IP_RATE_LIMIT_PER_HOUR));
  });
});

describe("getClientIp", () => {
  it("reads the first x-forwarded-for address", () => {
    const request = {
      headers: new Headers({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" }),
    } as NextRequest;
    expect(getClientIp(request)).toBe("198.51.100.2");
  });
});
