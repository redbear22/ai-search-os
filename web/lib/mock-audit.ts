import type { AIPlatform, AuditData, ClarityLayer, PlatformClarity } from "@/lib/audit-types";

export type { AIPlatform } from "@/lib/audit-types";

export const EMPTY_PLATFORM_CLARITY: PlatformClarity = {
  responseText: "",
  correctItems: [],
  wrongItems: [],
  missingItems: [],
};

/** Merge persisted clarity data; migrates legacy `google_ai` → `gemini`. */
export function normalizeClarityLayer(clarity: ClarityLayer): ClarityLayer {
  const raw = clarity.platforms as Record<string, PlatformClarity | undefined>;
  const platforms = {} as ClarityLayer["platforms"];

  for (const p of PLATFORMS) {
    platforms[p.id] = { ...EMPTY_PLATFORM_CLARITY, ...raw[p.id] };
  }

  if (raw.google_ai && !raw.gemini?.responseText?.trim()) {
    platforms.gemini = { ...EMPTY_PLATFORM_CLARITY, ...raw.google_ai };
  }

  return {
    platforms,
    comparison: clarity.comparison ?? { analyzedAt: null, consensusCorrect: [] },
  };
}

export const PLATFORMS: { id: AIPlatform; label: string }[] = [
  { id: "chatgpt", label: "ChatGPT" },
  { id: "perplexity", label: "Perplexity" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
  { id: "google_aio", label: "Google AI Overviews" },
];

export const EMPTY_AUDIT: AuditData = {
  discoverability: {
    seo: { traffic: 0, keywords: 0, siteHealth: 0 },
    aso: { aiVisibilityScore: 0, brandMentions: 0 },
    competitors: [{ name: "", traffic: 0, aiVisibility: 0, brandMentions: 0 }],
  },
  clarity: {
    platforms: {
      chatgpt: { ...EMPTY_PLATFORM_CLARITY },
      perplexity: { ...EMPTY_PLATFORM_CLARITY },
      claude: { ...EMPTY_PLATFORM_CLARITY },
      gemini: { ...EMPTY_PLATFORM_CLARITY },
      google_aio: { ...EMPTY_PLATFORM_CLARITY },
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
    sentimentScore: 0.5,
    reviewCount: 0,
    averageRating: 0,
    hedgedLanguageDetected: false,
  },
};

export const MOCK_AUDIT: AuditData = {
  discoverability: {
    seo: { traffic: 12400, keywords: 342, siteHealth: 78 },
    aso: { aiVisibilityScore: 62, brandMentions: 28 },
    competitors: [
      { name: "Competitor A", traffic: 18200, aiVisibility: 71, brandMentions: 45 },
      { name: "Competitor B", traffic: 9800, aiVisibility: 58, brandMentions: 19 },
      { name: "Competitor C", traffic: 15600, aiVisibility: 65, brandMentions: 33 },
    ],
  },
  clarity: {
    platforms: {
      chatgpt: {
        responseText:
          "Best home espresso machines include Breville Barista Express and Gaggia Classic Pro.",
        correctItems: ["Breville Barista Express", "Gaggia Classic Pro"],
        wrongItems: ["Nespresso Vertuo as primary espresso pick"],
        missingItems: ["Budget under $300", "Grinder pairing guidance"],
      },
      perplexity: {
        responseText: "Top picks: Breville Infuser, De'Longhi Dedica.",
        correctItems: ["Breville Infuser", "De'Longhi Dedica"],
        wrongItems: [],
        missingItems: ["Maintenance costs"],
      },
      claude: {
        responseText: "Semi-automatic machines with PID control are recommended.",
        correctItems: ["Semi-automatic recommendation"],
        wrongItems: ["Claims all pod machines are equivalent"],
        missingItems: ["Specific brand for entry-level"],
      },
      gemini: {
        responseText: "AI Overview highlights Breville, Gaggia, and Philips 3200.",
        correctItems: ["Breville", "Gaggia"],
        wrongItems: [],
        missingItems: ["Warranty comparison"],
      },
    },
    comparison: { analyzedAt: null, consensusCorrect: [] },
  },
  authority: {
    backlinksCount: 1247,
    citedPages: 38,
    sourcesCitingUs: [
      "seriouseats.com/reviews/best-espresso-machines",
      "wirecutter.com/reviews/best-espresso-machine",
    ],
    sourcesCitingCompetitorsOnly: [
      "tomsguide.com/best-espresso-machines",
      "cnet.com/home/kitchen-and-household/best-espresso-machines",
    ],
  },
  trust: {
    sentimentScore: 0.72,
    reviewCount: 1842,
    averageRating: 4.3,
    hedgedLanguageDetected: true,
  },
};

/** Demo values for localStorage seeding / quick testing */
export const DEMO_AUDIT: AuditData = {
  discoverability: {
    seo: { traffic: 125000, keywords: 7200, siteHealth: 89 },
    aso: { brandMentions: 47, aiVisibilityScore: 68 },
    competitors: [
      { name: "Competitor A", traffic: 100000, aiVisibility: 72, brandMentions: 55 },
    ],
  },
  clarity: MOCK_AUDIT.clarity,
  authority: {
    backlinksCount: 3400,
    citedPages: 12,
    sourcesCitingUs: Array.from({ length: 12 }, (_, i) => `example.com/source-${i + 1}`),
    sourcesCitingCompetitorsOnly: ["competitor-only.com/article"],
  },
  trust: {
    sentimentScore: 0.78,
    reviewCount: 156,
    averageRating: 4.2,
    hedgedLanguageDetected: false,
  },
};
