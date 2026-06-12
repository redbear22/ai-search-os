import { describe, expect, it } from "vitest";
import { resolveFeatureGate } from "@/components/ProgressiveFeatureGate";
import {
  getMinTierForFeature,
  hasFeature,
} from "@/lib/feature-flags";

describe("resolveFeatureGate", () => {
  it("allows cloudSave on starter and above", () => {
    expect(resolveFeatureGate("cloudSave", "free")).toBe("denied");
    expect(resolveFeatureGate("cloudSave", "starter")).toBe("allowed");
    expect(resolveFeatureGate("cloudSave", "pro")).toBe("allowed");
  });

  it("allows aiFixGeneration on pro and above only", () => {
    expect(resolveFeatureGate("aiFixGeneration", "starter")).toBe("denied");
    expect(resolveFeatureGate("aiFixGeneration", "pro")).toBe("allowed");
    expect(resolveFeatureGate("aiFixGeneration", "agency")).toBe("allowed");
  });

  it("matches hasFeature for all tier combinations", () => {
    const tiers = ["free", "starter", "pro", "agency", "enterprise"] as const;
    for (const tier of tiers) {
      const gate = resolveFeatureGate("viewGaps", tier);
      expect(gate === "allowed").toBe(hasFeature("viewGaps", tier));
    }
  });
});

describe("getMinTierForFeature", () => {
  it("returns starter as minimum tier for cloudSave", () => {
    expect(getMinTierForFeature("cloudSave")).toBe("starter");
  });

  it("returns pro as minimum tier for aiFixGeneration", () => {
    expect(getMinTierForFeature("aiFixGeneration")).toBe("pro");
  });

  it("returns agency as minimum tier for whiteLabel", () => {
    expect(getMinTierForFeature("whiteLabel")).toBe("agency");
  });
});
