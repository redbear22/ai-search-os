import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isAdminUnlimitedAccess,
  resolveEffectiveDomainLimit,
  resolveEffectiveTier,
} from "@/lib/resolve-effective-tier";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
  },
}));

describe("isAdminUnlimitedAccess", () => {
  it("returns true only for platform ADMIN role", () => {
    expect(isAdminUnlimitedAccess("ADMIN")).toBe(true);
    expect(isAdminUnlimitedAccess("APPROVED")).toBe(false);
    expect(isAdminUnlimitedAccess("AGENCY_OWNER")).toBe(false);
    expect(isAdminUnlimitedAccess(undefined)).toBe(false);
  });
});

describe("resolveEffectiveTier", () => {
  it("returns enterprise for ADMIN regardless of plan", () => {
    expect(resolveEffectiveTier("FREE", "ADMIN")).toBe("enterprise");
    expect(resolveEffectiveTier("PRO", "ADMIN")).toBe("enterprise");
  });

  it("maps plan normally for non-admin users", () => {
    expect(resolveEffectiveTier("FREE", "APPROVED")).toBe("starter");
    expect(resolveEffectiveTier("ENTERPRISE")).toBe("enterprise");
  });
});

describe("resolveEffectiveDomainLimit", () => {
  it("returns unlimited for ADMIN", () => {
    expect(resolveEffectiveDomainLimit("FREE", "ADMIN")).toBe(Infinity);
  });

  it("returns plan limit for non-admin users", () => {
    expect(resolveEffectiveDomainLimit("FREE", "APPROVED")).toBe(1);
    expect(resolveEffectiveDomainLimit("PRO")).toBe(5);
  });
});
