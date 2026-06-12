import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canRunFreeAudit,
  rateLimitByIp,
  resetAbuseRateLimitForTesting,
} from "@/lib/rate-limit";

function makeRequest(ip = "203.0.113.55"): Request {
  return new Request("http://localhost/api/audit/free", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("abuse rate limits", () => {
  beforeEach(() => {
    resetAbuseRateLimitForTesting("203.0.113.55");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    resetAbuseRateLimitForTesting();
  });

  it("rateLimitByIp bypasses when skip is true", async () => {
    for (let i = 0; i < 20; i += 1) {
      const result = await rateLimitByIp(makeRequest(), { skip: true });
      expect(result.success).toBe(true);
    }
  });

  it("canRunFreeAudit bypasses when skip is true", async () => {
    await canRunFreeAudit("203.0.113.55");
    const blocked = await canRunFreeAudit("203.0.113.55");
    expect(blocked.success).toBe(false);

    const bypassed = await canRunFreeAudit("203.0.113.55", { skip: true });
    expect(bypassed.success).toBe(true);
  });
});
