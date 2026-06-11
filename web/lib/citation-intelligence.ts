import { runMultiModelComparison, type ComparisonModel } from "./multi-model-comparison";

export type CitationPlatform = ComparisonModel;

export interface CitationRecord {
  id: string;
  query: string;
  platform: CitationPlatform;
  brandName: string;
  competitorName?: string;
  cited: boolean;
  citationUrl?: string;
  citationText?: string;
  confidenceScore: number;
  timestamp: string;
  originSignalDetected?: boolean;
}

export interface CitationTrend {
  period: "day" | "week" | "month" | "quarter";
  brandMentions: number;
  competitorMentions: Record<string, number>;
  newSources: string[];
  shareOfVoice: number;
}

export interface BotActivity {
  botName: string;
  lastVisit: string;
  pagesCrawled: number;
  userAgent: string;
}

export interface CitationGap {
  query: string;
  platform: string;
  competitorCited: string;
  citationUrl?: string;
  priority: "critical" | "high" | "medium";
}

export interface CitationRecommendation {
  action: string;
  targetPlatform: string;
  targetQuery: string;
  estimatedImpact: "high" | "medium" | "low";
}

export interface CitationIntelligence {
  totalCitations: number;
  brandMentionCount: number;
  competitorMentionCount: number;
  shareOfVoice: number;
  uniqueSources: string[];
  trends: CitationTrend[];
  citationGaps: CitationGap[];
  botActivity: BotActivity[];
  originSignalsDeployed: number;
  originSignalsDetected: number;
  recommendations: CitationRecommendation[];
}

export interface AuditHistoryEntry {
  timestamp: string;
  brandMentionCount: number;
  shareOfVoice: number;
  totalCitations: number;
  citationGaps: number;
}

const PLATFORMS: CitationPlatform[] = [
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
];

const AUDIT_HISTORY_KEY = "citation_audit_history";

const AI_BOTS = [
  { name: "GPTBot", userAgent: "GPTBot" },
  { name: "ClaudeBot", userAgent: "ClaudeBot" },
  { name: "PerplexityBot", userAgent: "PerplexityBot" },
  { name: "Google-Extended", userAgent: "Google-Extended" },
  { name: "CCBot", userAgent: "CCBot" },
  { name: "Amazonbot", userAgent: "Amazonbot" },
  { name: "Applebot", userAgent: "Applebot" },
  { name: "Meta-ExternalAgent", userAgent: "Meta-ExternalAgent" },
] as const;

function getAppBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function brandIdFromName(brandName: string): string {
  return brandName.toLowerCase().replace(/\s+/g, "");
}

function findCompetitorMentioned(
  text: string,
  competitors: string[]
): string | undefined {
  const lower = text.toLowerCase();
  return competitors.find((c) => lower.includes(c.toLowerCase()));
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function generateOriginSignal(content: string, brandId: string): string {
  const invisibleMarkers = ["\u200B", "\u200C", "\u200D", "\uFEFF"];
  const signal = `${invisibleMarkers[0]}CITE:${brandId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}${invisibleMarkers[1]}`;
  return content + signal;
}

export function detectOriginSignal(text: string, brandId: string): boolean {
  const pattern = new RegExp(`CITE:${brandId}:\\d+:[a-z0-9]+`);
  return pattern.test(text);
}

function parseBotAccess(robotsTxt: string, userAgent: string): boolean {
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.trim());
  let activeAgent = "*";
  let blockedRoot = false;

  for (const line of lines) {
    const agentMatch = line.match(/^user-agent:\s*(.+)$/i);
    if (agentMatch) {
      activeAgent = agentMatch[1].trim();
      continue;
    }

    const applies =
      activeAgent === "*" ||
      activeAgent.toLowerCase() === userAgent.toLowerCase();

    if (!applies) continue;

    if (/^disallow:\s*\/\s*$/i.test(line) || /^disallow:\s*\/\*$/i.test(line)) {
      blockedRoot = true;
    }
    if (/^allow:\s*\/\s*$/i.test(line)) {
      blockedRoot = false;
    }
  }

  return !blockedRoot;
}

export function buildBotActivityFromRobots(robotsTxt: string): BotActivity[] {
  const now = new Date().toISOString();

  return AI_BOTS.map((bot) => {
    const allowed = parseBotAccess(robotsTxt, bot.userAgent);
    return {
      botName: bot.name,
      lastVisit: now,
      pagesCrawled: allowed ? 1 : 0,
      userAgent: bot.userAgent,
    };
  });
}

export async function detectBotActivity(domain: string): Promise<BotActivity[]> {
  const normalized = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  try {
    const response = await fetch(
      `${getAppBaseUrl()}/api/citation-intelligence/bots?domain=${encodeURIComponent(normalized)}`
    );
    const data = await response.json();

    if (data.botActivity) {
      return data.botActivity as BotActivity[];
    }
  } catch (error) {
    console.error("Failed to fetch bot activity:", error);
  }

  return AI_BOTS.map((bot) => ({
    botName: bot.name,
    lastVisit: new Date().toISOString(),
    pagesCrawled: 0,
    userAgent: bot.userAgent,
  }));
}

function loadAuditHistory(): AuditHistoryEntry[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(AUDIT_HISTORY_KEY);
    const parsed = JSON.parse(raw || "[]") as AuditHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAuditHistoryEntry(
  entry: AuditHistoryEntry
): AuditHistoryEntry[] {
  if (!isBrowser()) return [entry];

  const auditHistory = loadAuditHistory();
  auditHistory.push(entry);

  while (auditHistory.length > 52) {
    auditHistory.shift();
  }

  localStorage.setItem(AUDIT_HISTORY_KEY, JSON.stringify(auditHistory));
  return auditHistory;
}

function getPeriodLength(period: CitationTrend["period"]): number {
  switch (period) {
    case "day":
      return 1;
    case "week":
      return 1;
    case "month":
      return 4;
    case "quarter":
      return 12;
    default:
      return 4;
  }
}

function calculateTrends(history: AuditHistoryEntry[]): CitationTrend[] {
  const periods: CitationTrend["period"][] = ["week", "month", "quarter"];

  return periods.map((period) => {
    const relevantHistory = history.slice(-getPeriodLength(period));
    const brandMentions = relevantHistory.reduce(
      (sum, h) => sum + h.brandMentionCount,
      0
    );
    const totalMentions = relevantHistory.reduce(
      (sum, h) => sum + h.totalCitations,
      0
    );

    return {
      period,
      brandMentions,
      competitorMentions: {},
      newSources: [],
      shareOfVoice:
        totalMentions > 0 ? (brandMentions / totalMentions) * 100 : 0,
    };
  });
}

function generateRecommendations(
  gaps: CitationGap[],
  shareOfVoice: number
): CitationRecommendation[] {
  const recommendations: CitationRecommendation[] = [];

  if (shareOfVoice < 30) {
    recommendations.push({
      action: "Create authoritative content targeting your top 5 missed queries",
      targetPlatform: "All",
      targetQuery: gaps[0]?.query || "top missed query",
      estimatedImpact: "high",
    });
  }

  for (const gap of gaps.slice(0, 3)) {
    recommendations.push({
      action: `Build citations from ${gap.competitorCited} for "${gap.query}" on ${gap.platform}`,
      targetPlatform: gap.platform,
      targetQuery: gap.query,
      estimatedImpact: gap.priority === "critical" ? "high" : "medium",
    });
  }

  return recommendations;
}

function recordsFromComparison(
  comparison: Awaited<ReturnType<typeof runMultiModelComparison>>,
  brandId: string,
  competitors: string[]
): CitationRecord[] {
  const records: CitationRecord[] = [];

  for (const platform of PLATFORMS) {
    const platformResponse = comparison.responses.find((r) => r.model === platform);
    if (!platformResponse || platformResponse.error) continue;

    const competitorName = findCompetitorMentioned(
      platformResponse.response,
      competitors
    );

    records.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      query: comparison.query,
      platform,
      brandName: comparison.brandName,
      competitorName,
      cited: platformResponse.brandMentioned,
      citationUrl: platformResponse.citations[0],
      citationText: platformResponse.response.substring(0, 200),
      confidenceScore: platformResponse.confidence,
      timestamp: comparison.timestamp,
      originSignalDetected: detectOriginSignal(platformResponse.response, brandId),
    });
  }

  return records;
}

export async function runWeeklyCitationAudit(
  queries: string[],
  brandName: string,
  competitors: string[],
  options?: { domain?: string; originSignalsDeployed?: number }
): Promise<CitationIntelligence> {
  const brandId = brandIdFromName(brandName);
  const allResults: CitationRecord[] = [];

  for (const query of queries) {
    const comparison = await runMultiModelComparison(
      query,
      brandName,
      competitors
    );
    allResults.push(...recordsFromComparison(comparison, brandId, competitors));
  }

  const brandMentionCount = allResults.filter((r) => r.cited).length;
  const totalCitations = allResults.length;
  const shareOfVoice =
    totalCitations > 0 ? (brandMentionCount / totalCitations) * 100 : 0;

  const citationGaps: CitationGap[] = [];
  for (const result of allResults) {
    if (!result.cited) {
      citationGaps.push({
        query: result.query,
        platform: result.platform,
        competitorCited: result.competitorName || "Unknown",
        citationUrl: result.citationUrl,
        priority:
          shareOfVoice < 30 ? "critical" : shareOfVoice < 50 ? "high" : "medium",
      });
    }
  }

  const auditHistory = saveAuditHistoryEntry({
    timestamp: new Date().toISOString(),
    brandMentionCount,
    shareOfVoice,
    totalCitations,
    citationGaps: citationGaps.length,
  });

  const botDomain =
    options?.domain?.replace(/^https?:\/\//, "").replace(/\/$/, "") ||
    `${brandId}.com`;

  return {
    totalCitations,
    brandMentionCount,
    competitorMentionCount: totalCitations - brandMentionCount,
    shareOfVoice,
    uniqueSources: [
      ...new Set(allResults.map((r) => r.citationUrl).filter(Boolean)),
    ] as string[],
    trends: calculateTrends(auditHistory),
    citationGaps: citationGaps.slice(0, 10),
    botActivity: await detectBotActivity(botDomain),
    originSignalsDeployed: options?.originSignalsDeployed ?? 0,
    originSignalsDetected: allResults.filter((r) => r.originSignalDetected)
      .length,
    recommendations: generateRecommendations(citationGaps, shareOfVoice),
  };
}
