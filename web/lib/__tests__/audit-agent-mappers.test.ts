import { describe, expect, it } from "vitest";
import { agentGapToUiGap, agentScoresToAuditData } from "@/lib/workflow-mappers";

describe("agentScoresToAuditData", () => {
  it("maps layer scores into audit store fields", () => {
    const data = agentScoresToAuditData({
      discoverability: 72,
      clarity: 80,
      authority: 61,
      trust: 88,
    });
    expect(data.discoverability.aso.aiVisibilityScore).toBe(72);
    expect(data.discoverability.seo.siteHealth).toBe(72);
    expect(data.authority.backlinksCount).toBe(61 * 12);
    expect(data.trust.averageRating).toBeGreaterThan(0);
    expect(data.clarity.platforms.chatgpt.responseText).toContain("80");
  });
});

describe("agentGapToUiGap", () => {
  it("maps agent gap payload to UI gap", () => {
    const gap = agentGapToUiGap(
      {
        layer: "authority",
        issue: "Authority scored 50/100",
        severity: "high",
        fix_hint: "Earn more citations",
      },
      "example.com",
      0
    );
    expect(gap.layer).toBe("authority");
    expect(gap.severity).toBe("high");
    expect(gap.source).toBe("example.com");
    expect(gap.suggestedAction).toBe("Earn more citations");
  });
});
