import {
  runMultiModelComparison,
  type ComparisonModel,
  type ComparisonResult,
} from "./multi-model-comparison";

export interface ZeroClickScore {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  percentile: number;
}

export interface BrandMentionRate {
  percentage: number;
  totalMentions: number;
  totalOpportunities: number;
  byPlatform: Record<string, number>;
  byQueryCategory: Record<string, number>;
}

export interface ShareOfVoice {
  brand: number;
  competitors: Record<string, number>;
  total: number;
  trend: number[];
}

export interface CitationDensity {
  yourCitations: number;
  competitorCitations: Record<string, number>;
  topCitedSources: string[];
  citationQuality: "high" | "medium" | "low";
}

export interface PlatformMetric {
  mentionRate: number;
  averagePosition?: number;
  citationCount: number;
  sentimentScore: number;
  responseTimeMs: number;
}

export interface PlatformMetrics {
  chatgpt: PlatformMetric;
  perplexity: PlatformMetric;
  claude: PlatformMetric;
  gemini: PlatformMetric;
}

export interface TrendData {
  date: string;
  brandMentions: number;
  shareOfVoice: number;
  citationCount: number;
}

export interface CompetitiveGap {
  competitor: string;
  query: string;
  platform: string;
  gapSize: number;
}

export interface CompetitiveLandscape {
  topCompetitors: string[];
  gaps: CompetitiveGap[];
  emergingThreats: string[];
}

export interface ZeroClickRecommendation {
  priority: "critical" | "high" | "medium" | "low";
  type: "content" | "citations" | "entity" | "structured_data";
  title: string;
  description: string;
  expectedImprovement: number;
  effort: "low" | "medium" | "high";
}

export interface ZeroClickMetrics {
  overall: ZeroClickScore;
  brandMentionRate: BrandMentionRate;
  shareOfVoice: ShareOfVoice;
  citationDensity: CitationDensity;
  platformSpecific: PlatformMetrics;
  trends: TrendData[];
  competitiveLandscape: CompetitiveLandscape;
  recommendations: ZeroClickRecommendation[];
}

const PLATFORMS: ComparisonModel[] = [
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
];

const HISTORY_KEY = "zero_click_visibility_history";

type QueryCategory =
  | "informational"
  | "commercial"
  | "navigational"
  | "transactional";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function classifyQuery(query: string): QueryCategory {
  const q = query.toLowerCase();
  if (q.includes("login") || q.includes("sign in") || q.includes("home")) {
    return "navigational";
  }
  if (q.includes("buy") || q.includes("price") || q.includes("cost")) {
    return "transactional";
  }
  if (
    q.includes("best") ||
    q.includes("top") ||
    q.includes("review") ||
    q.includes("vs")
  ) {
    return "commercial";
  }
  return "informational";
}

function sentimentToScore(sentiment: "positive" | "neutral" | "negative"): number {
  if (sentiment === "positive") return 0.85;
  if (sentiment === "neutral") return 0.5;
  return 0.2;
}

function findCompetitorsMentioned(
  text: string,
  competitors: string[]
): string[] {
  const lower = text.toLowerCase();
  return competitors.filter((c) => lower.includes(c.toLowerCase()));
}

function emptyPlatformMetric(): PlatformMetric {
  return {
    mentionRate: 0,
    citationCount: 0,
    sentimentScore: 0,
    responseTimeMs: 0,
  };
}

function buildPlatformMetrics(
  comparisons: ComparisonResult[]
): PlatformMetrics {
  const buckets: Record<
    ComparisonModel,
    {
      mentions: number;
      citations: number;
      sentiment: number;
      responseTime: number;
      checks: number;
    }
  > = {
    chatgpt: { mentions: 0, citations: 0, sentiment: 0, responseTime: 0, checks: 0 },
    perplexity: { mentions: 0, citations: 0, sentiment: 0, responseTime: 0, checks: 0 },
    claude: { mentions: 0, citations: 0, sentiment: 0, responseTime: 0, checks: 0 },
    gemini: { mentions: 0, citations: 0, sentiment: 0, responseTime: 0, checks: 0 },
  };

  for (const comparison of comparisons) {
    for (const response of comparison.responses) {
      if (response.error) continue;

      const bucket = buckets[response.model];
      bucket.checks += 1;
      if (response.brandMentioned) bucket.mentions += 1;
      bucket.citations += response.citations.length;
      bucket.sentiment += sentimentToScore(response.sentiment);
      bucket.responseTime += response.responseTime;
    }
  }

  const toMetric = (model: ComparisonModel): PlatformMetric => {
    const b = buckets[model];
    if (b.checks === 0) return emptyPlatformMetric();

    return {
      mentionRate: (b.mentions / b.checks) * 100,
      citationCount: b.citations,
      sentimentScore: b.sentiment / b.checks,
      responseTimeMs: Math.round(b.responseTime / b.checks),
    };
  };

  return {
    chatgpt: toMetric("chatgpt"),
    perplexity: toMetric("perplexity"),
    claude: toMetric("claude"),
    gemini: toMetric("gemini"),
  };
}

function categorizeByQueryType(
  comparisons: ComparisonResult[]
): Record<string, number> {
  const categories: Record<QueryCategory, { mentions: number; total: number }> = {
    informational: { mentions: 0, total: 0 },
    commercial: { mentions: 0, total: 0 },
    navigational: { mentions: 0, total: 0 },
    transactional: { mentions: 0, total: 0 },
  };

  for (const comparison of comparisons) {
    const category = classifyQuery(comparison.query);
    for (const response of comparison.responses) {
      if (response.error) continue;
      categories[category].total += 1;
      if (response.brandMentioned) categories[category].mentions += 1;
    }
  }

  return Object.fromEntries(
    Object.entries(categories).map(([cat, data]) => [
      cat,
      data.total > 0 ? (data.mentions / data.total) * 100 : 0,
    ])
  );
}

function buildCompetitiveGaps(
  comparisons: ComparisonResult[],
  competitors: string[]
): CompetitiveGap[] {
  const gaps: CompetitiveGap[] = [];

  for (const comparison of comparisons) {
    for (const response of comparison.responses) {
      if (response.error || response.brandMentioned) continue;

      const mentioned = findCompetitorsMentioned(
        response.response,
        competitors
      );
      for (const competitor of mentioned) {
        gaps.push({
          competitor,
          query: comparison.query,
          platform: response.model,
          gapSize: 100,
        });
      }
    }
  }

  return gaps.slice(0, 20);
}

function buildCompetitorMentions(
  comparisons: ComparisonResult[],
  competitors: string[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const competitor of competitors) counts[competitor] = 0;

  for (const comparison of comparisons) {
    for (const response of comparison.responses) {
      if (response.error) continue;
      for (const competitor of findCompetitorsMentioned(
        response.response,
        competitors
      )) {
        counts[competitor] = (counts[competitor] ?? 0) + 1;
      }
    }
  }

  return counts;
}

function buildCompetitorCitations(
  comparisons: ComparisonResult[],
  competitors: string[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const competitor of competitors) counts[competitor] = 0;

  for (const comparison of comparisons) {
    for (const response of comparison.responses) {
      if (response.error) continue;
      for (const url of response.citations) {
        const host = url.toLowerCase();
        for (const competitor of competitors) {
          const slug = competitor.toLowerCase().replace(/\s+/g, "");
          if (host.includes(slug)) {
            counts[competitor] = (counts[competitor] ?? 0) + 1;
          }
        }
      }
    }
  }

  return counts;
}

export function loadZeroClickTrends(): TrendData[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = JSON.parse(raw || "[]") as TrendData[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveZeroClickTrendEntry(entry: TrendData): TrendData[] {
  if (!isBrowser()) return [entry];

  const history = loadZeroClickTrends();
  history.push(entry);

  while (history.length > 52) {
    history.shift();
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

function calculateOverallScore(
  mentionRate: number,
  shareOfVoice: number
): number {
  return Math.round(mentionRate * 0.6 + shareOfVoice * 0.4);
}

function calculateGrade(score: number): ZeroClickScore["grade"] {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

function estimatePercentile(score: number): number {
  return Math.min(99, Math.max(1, Math.round(score * 0.95)));
}

function generateZeroClickRecommendations(
  mentionRate: BrandMentionRate,
  shareOfVoice: ShareOfVoice,
  platformMetrics: PlatformMetrics
): ZeroClickRecommendation[] {
  const recommendations: ZeroClickRecommendation[] = [];

  if (mentionRate.percentage < 30) {
    recommendations.push({
      priority: "critical",
      type: "content",
      title: "Low brand mention rate across AI platforms",
      description: `Your brand appears in only ${mentionRate.percentage.toFixed(1)}% of relevant AI responses`,
      expectedImprovement: 25,
      effort: "high",
    });
  }

  const lowPerformingPlatforms = Object.entries(mentionRate.byPlatform)
    .filter(([, rate]) => rate < 30)
    .map(([platform]) => platform);

  if (lowPerformingPlatforms.length > 0) {
    recommendations.push({
      priority: "high",
      type: "citations",
      title: `Low visibility on ${lowPerformingPlatforms.join(", ")}`,
      description:
        "Build platform-specific authority signals for these AI engines",
      expectedImprovement: 20,
      effort: "medium",
    });
  }

  const avgCitationDensity =
    Object.values(platformMetrics).reduce((sum, p) => sum + p.citationCount, 0) /
    PLATFORMS.length;

  if (avgCitationDensity < 2) {
    recommendations.push({
      priority: "high",
      type: "structured_data",
      title: "Increase citation density",
      description: "AI platforms rarely cite your content as a source",
      expectedImprovement: 30,
      effort: "medium",
    });
  }

  if (shareOfVoice.brand < 20) {
    recommendations.push({
      priority: "critical",
      type: "entity",
      title: "Dominated by competitors",
      description: `Your share of voice (${shareOfVoice.brand.toFixed(1)}%) is below competitor averages`,
      expectedImprovement: 40,
      effort: "high",
    });
  }

  return recommendations;
}

export async function calculateZeroClickVisibility(
  brandName: string,
  queries: string[],
  competitors: string[]
): Promise<ZeroClickMetrics> {
  const validQueries = queries.map((q) => q.trim()).filter(Boolean);
  const validCompetitors = competitors.map((c) => c.trim()).filter(Boolean);

  const comparisons: ComparisonResult[] = [];
  for (const query of validQueries) {
    comparisons.push(
      await runMultiModelComparison(query, brandName, validCompetitors)
    );
  }

  const platformMetrics = buildPlatformMetrics(comparisons);

  const totalOpportunities = validQueries.length * PLATFORMS.length;
  let totalMentions = 0;

  for (const comparison of comparisons) {
    for (const response of comparison.responses) {
      if (!response.error && response.brandMentioned) totalMentions += 1;
    }
  }

  const brandMentionRate: BrandMentionRate = {
    percentage:
      totalOpportunities > 0
        ? (totalMentions / totalOpportunities) * 100
        : 0,
    totalMentions,
    totalOpportunities,
    byPlatform: {
      chatgpt: platformMetrics.chatgpt.mentionRate,
      perplexity: platformMetrics.perplexity.mentionRate,
      claude: platformMetrics.claude.mentionRate,
      gemini: platformMetrics.gemini.mentionRate,
    },
    byQueryCategory: categorizeByQueryType(comparisons),
  };

  const competitorMentions = buildCompetitorMentions(
    comparisons,
    validCompetitors
  );
  const competitorTotal = Object.values(competitorMentions).reduce(
    (a, b) => a + b,
    0
  );
  const totalVoice = totalMentions + competitorTotal;

  const shareOfVoice: ShareOfVoice = {
    brand: totalVoice > 0 ? (totalMentions / totalVoice) * 100 : 0,
    competitors: competitorMentions,
    total: totalVoice,
    trend: loadZeroClickTrends().map((t) => t.shareOfVoice),
  };

  const yourCitations = Object.values(platformMetrics).reduce(
    (sum, p) => sum + p.citationCount,
    0
  );

  const allCitations = comparisons.flatMap((c) =>
    c.responses.flatMap((r) => r.citations)
  );
  const topCitedSources = [...new Set(allCitations)].slice(0, 10);

  const gaps = buildCompetitiveGaps(comparisons, validCompetitors);
  const topCompetitors = [...validCompetitors]
    .sort((a, b) => (competitorMentions[b] ?? 0) - (competitorMentions[a] ?? 0))
    .slice(0, 3);

  const emergingThreats = topCompetitors.filter(
    (c) => (competitorMentions[c] ?? 0) > totalMentions / Math.max(1, validCompetitors.length)
  );

  const overallScore = calculateOverallScore(
    brandMentionRate.percentage,
    shareOfVoice.brand
  );

  const trends = loadZeroClickTrends();

  return {
    overall: {
      score: overallScore,
      grade: calculateGrade(overallScore),
      percentile: estimatePercentile(overallScore),
    },
    brandMentionRate,
    shareOfVoice,
    citationDensity: {
      yourCitations,
      competitorCitations: buildCompetitorCitations(
        comparisons,
        validCompetitors
      ),
      topCitedSources,
      citationQuality:
        yourCitations > 10 ? "high" : yourCitations > 5 ? "medium" : "low",
    },
    platformSpecific: platformMetrics,
    trends,
    competitiveLandscape: {
      topCompetitors,
      gaps,
      emergingThreats,
    },
    recommendations: generateZeroClickRecommendations(
      brandMentionRate,
      shareOfVoice,
      platformMetrics
    ),
  };
}
