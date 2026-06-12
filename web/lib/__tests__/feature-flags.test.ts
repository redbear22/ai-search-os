import { describe, expect, it } from "vitest";
import {
  getMinTierForFeature,
  getNextTier,
  getRequiredTierForFeature,
  hasFeature,
  resolveUserTierFromPlanType,
} from "@/lib/feature-flags";

describe("hasFeature", () => {
  it("allows core features on free tier", () => {
    expect(hasFeature("runAudit", "free")).toBe(true);
    expect(hasFeature("viewGaps", "free")).toBe(true);
  });

  it("denies starter-only features on free tier", () => {
    expect(hasFeature("cloudSave", "free")).toBe(false);
    expect(hasFeature("singleDomain", "free")).toBe(false);
  });

  it("allows pro features on pro and above", () => {
    expect(hasFeature("aiFixGeneration", "pro")).toBe(true);
    expect(hasFeature("aiFixGeneration", "agency")).toBe(true);
    expect(hasFeature("aiFixGeneration", "starter")).toBe(false);
  });

  it("allows enterprise-only features on enterprise", () => {
    expect(hasFeature("sso", "enterprise")).toBe(true);
    expect(hasFeature("sso", "agency")).toBe(false);
  });

  it("returns false for unknown feature keys", () => {
    expect(hasFeature("nonexistent" as "runAudit", "free")).toBe(false);
  });
});

describe("getNextTier", () => {
  it("returns the next tier in rank order", () => {
    expect(getNextTier("free")).toBe("starter");
    expect(getNextTier("starter")).toBe("pro");
    expect(getNextTier("pro")).toBe("agency");
    expect(getNextTier("agency")).toBe("enterprise");
  });

  it("returns null at the top tier", () => {
    expect(getNextTier("enterprise")).toBeNull();
  });
});

describe("getRequiredTierForFeature", () => {
  it("finds the lowest tier by rank order", () => {
    expect(getRequiredTierForFeature("runAudit")).toBe("free");
    expect(getRequiredTierForFeature("cloudSave")).toBe("starter");
    expect(getRequiredTierForFeature("aiFixGeneration")).toBe("pro");
    expect(getRequiredTierForFeature("whiteLabel")).toBe("agency");
    expect(getRequiredTierForFeature("sso")).toBe("enterprise");
  });

  it("matches getMinTierForFeature when a tier unlocks the feature", () => {
    expect(getRequiredTierForFeature("pdfExport")).toBe(
      getMinTierForFeature("pdfExport")
    );
  });
});

describe("getMinTierForFeature", () => {
  it("finds the lowest tier that unlocks a feature", () => {
    expect(getMinTierForFeature("runAudit")).toBe("free");
    expect(getMinTierForFeature("cloudSave")).toBe("starter");
    expect(getMinTierForFeature("aiFixGeneration")).toBe("pro");
  });

  it("exposes getRequiredTierForFeature as an alias", () => {
    expect(getRequiredTierForFeature("whiteLabel")).toBe("agency");
    expect(getRequiredTierForFeature("cloudSave")).toBe(
      getMinTierForFeature("cloudSave")
    );
  });
});

describe("resolveUserTierFromPlanType", () => {
  it("maps FREE to starter (paid Starter plan)", () => {
    expect(resolveUserTierFromPlanType("FREE")).toBe("starter");
  });

  it("maps paid plan types to matching tiers", () => {
    expect(resolveUserTierFromPlanType("PRO")).toBe("pro");
    expect(resolveUserTierFromPlanType("AGENCY")).toBe("agency");
    expect(resolveUserTierFromPlanType("ENTERPRISE")).toBe("enterprise");
  });
});
