import { describe, expect, it } from "vitest";
import { isFeatureUnlocked } from "@/components/FeatureGate";
import {
  getMinTierForFeature,
  getRequiredTierForFeature,
  hasFeature,
} from "@/lib/feature-flags";

describe("isFeatureUnlocked", () => {
  it("allows core audit features on free tier", () => {
    expect(isFeatureUnlocked("runAudit", "free")).toBe(true);
    expect(isFeatureUnlocked("viewGaps", "free")).toBe(true);
  });

  it("denies cloudSave on free tier", () => {
    expect(isFeatureUnlocked("cloudSave", "free")).toBe(false);
    expect(isFeatureUnlocked("cloudSave", "starter")).toBe(true);
  });

  it("denies aiFixGeneration below pro", () => {
    expect(isFeatureUnlocked("aiFixGeneration", "starter")).toBe(false);
    expect(isFeatureUnlocked("aiFixGeneration", "pro")).toBe(true);
  });
});

describe("getRequiredTierForFeature", () => {
  it("aliases getMinTierForFeature", () => {
    expect(getRequiredTierForFeature("cloudSave")).toBe(
      getMinTierForFeature("cloudSave")
    );
    expect(getRequiredTierForFeature("aiFixGeneration")).toBe("pro");
  });

  it("matches hasFeature at required tier", () => {
    const feature = "cloudSave" as const;
    const required = getRequiredTierForFeature(feature);
    expect(required).toBeTruthy();
    if (required) {
      expect(hasFeature(feature, required)).toBe(true);
      expect(hasFeature(feature, "free")).toBe(false);
    }
  });
});
