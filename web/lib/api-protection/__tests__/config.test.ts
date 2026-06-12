import { describe, expect, it } from "vitest";
import {
  isPublicApiPath,
  isRateLimitedPublicApiPath,
} from "@/lib/api-protection/config";

describe("isPublicApiPath", () => {
  it("treats free audit as public (no session gate)", () => {
    expect(isPublicApiPath("/api/audit/free")).toBe(true);
  });

  it("treats user plan/tier as public (returns free tier without session)", () => {
    expect(isPublicApiPath("/api/user/plan")).toBe(true);
    expect(isPublicApiPath("/api/user/tier")).toBe(true);
  });

  it("treats nested public API prefixes as public", () => {
    expect(isPublicApiPath("/api/client/foo")).toBe(true);
  });

  it("does not treat protected API routes as public", () => {
    expect(isPublicApiPath("/api/gaps/detect")).toBe(false);
  });
});

describe("isRateLimitedPublicApiPath", () => {
  it("rate-limits free audit despite being public", () => {
    expect(isRateLimitedPublicApiPath("/api/audit/free")).toBe(true);
  });
});
