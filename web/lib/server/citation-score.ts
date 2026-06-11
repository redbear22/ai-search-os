import "server-only";

export type CitationScoreInput = {
  citations: Array<{
    platform?: string;
    publication?: string;
    cited?: boolean;
    confidenceScore?: number;
    query?: string;
    citationUrl?: string;
  }>;
  brandName?: string;
};

export type CitationScoreBreakdown = {
  key: string;
  score: number;
  weight: number;
  cited: boolean;
};

export type CitationScoreResult = {
  normalizedScore: number;
  citedRate: number;
  citationCount: number;
  breakdown: CitationScoreBreakdown[];
  authorityWeight: number;
};

const PUBLICATION_AUTHORITY: Record<string, number> = {
  techcrunch: 5.0,
  forbes: 4.2,
  wired: 3.8,
  "the verge": 3.5,
  g2: 3.2,
  producthunt: 2.8,
  medium: 1.4,
  reddit: 1.6,
  wikipedia: 4.5,
  bloomberg: 4.0,
};

const PLATFORM_WEIGHT: Record<string, number> = {
  chatgpt: 1.0,
  perplexity: 1.1,
  claude: 0.95,
  gemini: 0.9,
};

function publicationMultiplier(publication?: string, citationUrl?: string): number {
  const haystack = `${publication ?? ""} ${citationUrl ?? ""}`.toLowerCase();
  for (const [name, multiplier] of Object.entries(PUBLICATION_AUTHORITY)) {
    if (haystack.includes(name)) return multiplier;
  }
  if (haystack.includes(".edu")) return 3.5;
  if (haystack.includes(".gov")) return 4.0;
  return 1.0;
}

function platformWeight(platform?: string): number {
  if (!platform) return 1;
  return PLATFORM_WEIGHT[platform.toLowerCase()] ?? 1;
}

function scoreSingleCitation(citation: CitationScoreInput["citations"][number]): number {
  const cited = Boolean(citation.cited);
  const base = cited ? 55 : 15;
  const confidence =
    typeof citation.confidenceScore === "number"
      ? Math.min(20, Math.max(0, citation.confidenceScore * 20))
      : cited
        ? 10
        : 0;
  const authority = Math.min(25, publicationMultiplier(citation.publication, citation.citationUrl) * 5);
  const platformBoost = platformWeight(citation.platform) * 5;
  return Math.min(100, base + confidence + authority + platformBoost);
}

export function scoreCitations(input: CitationScoreInput): CitationScoreResult {
  const citations = input.citations ?? [];
  if (citations.length === 0) {
    return {
      normalizedScore: 0,
      citedRate: 0,
      citationCount: 0,
      breakdown: [],
      authorityWeight: 0,
    };
  }

  const breakdown: CitationScoreBreakdown[] = citations.map((citation, index) => {
    const score = scoreSingleCitation(citation);
    const weight = platformWeight(citation.platform) * publicationMultiplier(citation.publication, citation.citationUrl);
    const key =
      citation.query?.trim() ||
      citation.publication?.trim() ||
      citation.platform?.trim() ||
      `citation-${index + 1}`;
    return {
      key,
      score: Math.round(score),
      weight: Math.round(weight * 100) / 100,
      cited: Boolean(citation.cited),
    };
  });

  const totalWeight = breakdown.reduce((sum, row) => sum + row.weight, 0) || breakdown.length;
  const weighted =
    breakdown.reduce((sum, row) => sum + row.score * row.weight, 0) / totalWeight;
  const citedCount = breakdown.filter((row) => row.cited).length;
  const authorityWeight =
    breakdown.reduce((sum, row) => sum + row.weight, 0) / breakdown.length;

  return {
    normalizedScore: Math.round(Math.min(100, Math.max(0, weighted))),
    citedRate: Math.round((citedCount / breakdown.length) * 100),
    citationCount: breakdown.length,
    breakdown,
    authorityWeight: Math.round(authorityWeight * 100) / 100,
  };
}
