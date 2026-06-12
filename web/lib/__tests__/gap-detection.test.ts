import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AuditData } from "@/lib/audit-types";
import { mapUnifiedAuditToAuditData } from "@/lib/map-unified-audit";
import type { UnifiedAuditResult } from "@/lib/unified-audit-types";
import { detectGaps } from "@/lib/server/gap-detection";

function emptyAudit(overrides: Partial<AuditData> = {}): AuditData {
  const base: AuditData = {
    discoverability: {
      seo: { traffic: 0, keywords: 0, siteHealth: 0 },
      aso: { aiVisibilityScore: 0, brandMentions: 0 },
      competitors: [{ name: "", traffic: 0, aiVisibility: 0, brandMentions: 0 }],
    },
    clarity: {
      platforms: {
        chatgpt: { responseText: "", correctItems: [], wrongItems: [], missingItems: [] },
        perplexity: { responseText: "", correctItems: [], wrongItems: [], missingItems: [] },
        claude: { responseText: "", correctItems: [], wrongItems: [], missingItems: [] },
        gemini: { responseText: "", correctItems: [], wrongItems: [], missingItems: [] },
      },
      comparison: { analyzedAt: null, consensusCorrect: [] },
    },
    authority: {
      backlinksCount: 0,
      citedPages: 0,
      sourcesCitingUs: [],
      sourcesCitingCompetitorsOnly: [],
    },
    trust: {
      sentimentScore: 0,
      reviewCount: 0,
      averageRating: 0,
      hedgedLanguageDetected: false,
    },
  };
  return { ...base, ...overrides };
}

describe("detectGaps mock filtering", () => {
  it("collapses empty clarity platforms into one informational gap", () => {
    const gaps = detectGaps(
      emptyAudit({
        discoverability: {
          seo: { traffic: 1200, keywords: 3, siteHealth: 72 },
          aso: { aiVisibilityScore: 45, brandMentions: 2 },
          competitors: [{ name: "", traffic: 0, aiVisibility: 0, brandMentions: 0 }],
        },
        clarity: {
          platforms: {
            chatgpt: {
              responseText: "[Mock] Brand overview placeholder",
              correctItems: [],
              wrongItems: [],
              missingItems: [],
            },
            perplexity: { responseText: "", correctItems: [], wrongItems: [], missingItems: [] },
            claude: { responseText: "", correctItems: [], wrongItems: [], missingItems: [] },
            gemini: { responseText: "", correctItems: [], wrongItems: [], missingItems: [] },
          },
          comparison: { analyzedAt: null, consensusCorrect: [] },
        },
      })
    );

    const clarityGaps = gaps.filter((g) => g.layer === "clarity");
    expect(clarityGaps).toHaveLength(1);
    expect(clarityGaps[0]?.title).toBe("AI platform responses not captured");
    expect(gaps.some((g) => g.title.includes("Trending topic"))).toBe(false);
  });

  it("dedupes identical missing items across platforms", () => {
    const item = "Enterprise SSO support";
    const gaps = detectGaps(
      emptyAudit({
        clarity: {
          platforms: {
            chatgpt: {
              responseText: "Live response about the brand.",
              correctItems: [],
              wrongItems: [],
              missingItems: [item],
            },
            perplexity: {
              responseText: "Another live response.",
              correctItems: [],
              wrongItems: [],
              missingItems: [item],
            },
            claude: { responseText: "", correctItems: [], wrongItems: [], missingItems: [] },
            gemini: { responseText: "", correctItems: [], wrongItems: [], missingItems: [] },
          },
          comparison: { analyzedAt: null, consensusCorrect: [] },
        },
      })
    );

    const missingGaps = gaps.filter((g) => g.title.includes("Missing brand attribute"));
    expect(missingGaps).toHaveLength(1);
    expect(missingGaps[0]?.description).toContain("ChatGPT");
    expect(missingGaps[0]?.description).toContain("Perplexity");
  });

  it("skips placeholder competitor citation and keyword gaps", () => {
    const gaps = detectGaps(
      emptyAudit({
        discoverability: {
          seo: { traffic: 1200, keywords: 3, siteHealth: 72 },
          aso: { aiVisibilityScore: 30, brandMentions: 2 },
          competitors: [
            { name: "competitor1.com", traffic: 5000, aiVisibility: 80, brandMentions: 12 },
          ],
        },
        authority: {
          backlinksCount: 500,
          citedPages: 2,
          sourcesCitingUs: ["https://example.com"],
          sourcesCitingCompetitorsOnly: ["https://competitor1.com"],
        },
      })
    );

    expect(gaps.some((g) => g.title.includes("competitor1.com"))).toBe(false);
    expect(gaps.some((g) => g.title.includes("alternative"))).toBe(false);
    expect(gaps.some((g) => g.title === "Add competitors for benchmarking")).toBe(true);
  });

  it("ignores mock trending-topic missing items", () => {
    const trendItem = "Trending topic: competitor2.com (google, gap +22)";
    const gaps = detectGaps(
      emptyAudit({
        clarity: {
          platforms: {
            chatgpt: {
              responseText: "Live brand response.",
              correctItems: [],
              wrongItems: [],
              missingItems: [trendItem],
            },
            perplexity: { responseText: "", correctItems: [], wrongItems: [], missingItems: [trendItem] },
            claude: { responseText: "", correctItems: [], wrongItems: [], missingItems: [trendItem] },
            gemini: { responseText: "", correctItems: [], wrongItems: [], missingItems: [trendItem] },
          },
          comparison: { analyzedAt: null, consensusCorrect: [] },
        },
      })
    );

    expect(gaps.some((g) => g.title.includes("Trending topic"))).toBe(false);
  });
});

describe("mapUnifiedAuditToAuditData", () => {
  const mockResult: UnifiedAuditResult = {
    clarity: {
      data: "[Mock] Example brand is known in its category.",
      source: "mock",
      mock: true,
    },
    discoverability: {
      keywords: {
        data: { data: [{ keyword: "ExampleBrand", vol: 900 }] },
        source: "mock",
        mock: true,
      },
      rankings: { data: {}, source: "mock", mock: true },
      trends: { data: [], source: "mock", mock: true },
    },
    authority: { data: { total_backlinks: 100, referring_domains: 20 }, source: "mock", mock: true },
    trust: null,
    contentGaps: {
      data: [{ topic: "competitor2.com", brandScore: 10, competitorScore: 40, source: "google", gap: 30 }],
      source: "mock",
      mock: true,
    },
    errors: [],
  };

  it("strips placeholder competitors and invented citation gaps", () => {
    const mapped = mapUnifiedAuditToAuditData(mockResult, {
      brandName: "ExampleBrand",
      domain: "example.com",
      competitors: ["competitor1.com", "wirecutter.com"],
    });

    expect(mapped.discoverability.competitors).toHaveLength(1);
    expect(mapped.discoverability.competitors[0]?.name).toBe("wirecutter.com");
    expect(mapped.authority.sourcesCitingCompetitorsOnly).toEqual([]);
    expect(mapped.clarity.platforms.chatgpt.missingItems).toEqual([]);
    expect(mapped.clarity.platforms.perplexity.missingItems).toEqual([]);
  });
});
