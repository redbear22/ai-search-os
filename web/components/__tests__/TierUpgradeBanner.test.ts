import { describe, expect, it } from "vitest";
import { formatTierResourceLabel } from "@/components/TierUpgradeBanner";

describe("formatTierResourceLabel", () => {
  it("uses friendly labels for underscored resources", () => {
    expect(formatTierResourceLabel("team_seats")).toBe("team members");
  });

  it("passes through simple resource names", () => {
    expect(formatTierResourceLabel("domains")).toBe("domains");
    expect(formatTierResourceLabel("competitors")).toBe("competitors");
    expect(formatTierResourceLabel("prompts")).toBe("AI prompts");
    expect(formatTierResourceLabel("history_days")).toBe("days of history");
  });
});
