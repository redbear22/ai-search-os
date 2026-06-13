import type { TrendData } from "@/lib/trends-mcp-client";
import type { UnifiedAuditResult } from "@/lib/unified-audit-types";
import type { AIPlatform, AuditData, CompetitorRow } from "@/lib/audit-types";
import { filterRealCompetitors } from "@/lib/audit-gap-heuristics";

export interface AuditRunContext {
  brandName: string;
  domain: string;
  competitors: string[];
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function extractKeywordRows(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data as Array<Record<string, unknown>>;
  const tasks = Array.isArray(obj.tasks) ? obj.tasks : [];
  const first = tasks[0] as Record<string, unknown> | undefined;
  const results = first?.result;
  if (Array.isArray(results)) {
    return results.flatMap((r) => {
      if (r && typeof r === "object" && Array.isArray((r as { items?: unknown }).items)) {
        return (r as { items: Array<Record<string, unknown>> }).items;
      }
      return typeof r === "object" && r ? [r as Record<string, unknown>] : [];
    });
  }
  return [];
}

function keywordVolume(row: Record<string, unknown>): number {
  return num(row.vol ?? row.search_volume ?? row.volume, 0);
}

function avgTrendScore(trends: TrendData[], keyword: string): number {
  const rows = trends.filter((t) => t.keyword === keyword);
  if (!rows.length) return 0;
  return Math.round(rows.reduce((s, t) => s + t.score, 0) / rows.length);
}

function parseBacklinks(payload: unknown): { backlinks: number; referringDomains: number } {
  if (!payload || typeof payload !== "object") {
    return { backlinks: 0, referringDomains: 0 };
  }
  const mock = payload as { total_backlinks?: number; referring_domains?: number };
  if (mock.total_backlinks != null) {
    return {
      backlinks: num(mock.total_backlinks),
      referringDomains: num(mock.referring_domains),
    };
  }
  const tasks = Array.isArray((payload as { tasks?: unknown }).tasks)
    ? (payload as { tasks: Array<Record<string, unknown>> }).tasks
    : [];
  const taskResult = tasks[0]?.result;
  const result = Array.isArray(taskResult)
    ? (taskResult[0] as Record<string, unknown> | undefined)
    : undefined;
  if (!result) return { backlinks: 0, referringDomains: 0 };
  return {
    backlinks: num(result.backlinks ?? result.total_backlinks),
    referringDomains: num(result.referring_domains ?? result.referring_domains_count),
  };
}

/** Map unified API results into audit store shape. */
export function mapUnifiedAuditToAuditData(
  result: UnifiedAuditResult,
  ctx: AuditRunContext
): AuditData {
  const { brandName, domain } = ctx;
  const competitors = filterRealCompetitors(ctx.competitors);
  const keywordRows = extractKeywordRows(result.discoverability.keywords?.data);
  const brandKw = keywordRows.find(
    (r) =>
      String(r.keyword ?? r.kw ?? "")
        .toLowerCase()
        .includes(brandName.toLowerCase().slice(0, 8)) || keywordRows.length === 1
  );
  const trends = result.discoverability.trends?.data ?? [];
  const brandTrend = avgTrendScore(trends, brandName);
  const totalVolume = keywordRows.reduce((s, r) => s + keywordVolume(r), 0);

  const competitorRows: CompetitorRow[] = competitors.map((name) => ({
    name,
    traffic: Math.round(totalVolume * 0.4 + avgTrendScore(trends, name) * 100),
    aiVisibility: avgTrendScore(trends, name) || 0,
    brandMentions: Math.round(avgTrendScore(trends, name) / 4),
  }));

  const clarityText = result.clarity?.data ?? "";

  const clarityPlatforms = {} as AuditData["clarity"]["platforms"];
  const platforms: AIPlatform[] = ["chatgpt", "perplexity", "claude", "gemini", "google_aio"];
  for (const platform of platforms) {
    clarityPlatforms[platform] = {
      responseText: platform === "chatgpt" ? clarityText : "",
      correctItems: brandName ? [brandName] : [],
      wrongItems: [],
      missingItems: [],
    };
  }

  const { backlinks, referringDomains } = parseBacklinks(result.authority?.data);

  const trustPayload = result.trust?.data as
    | { reviews?: { count?: number; rating?: number }; asin?: string }
    | undefined;

  return {
    discoverability: {
      seo: {
        traffic: totalVolume || num(brandKw && keywordVolume(brandKw), 0) * 12 || 1200,
        keywords: keywordRows.length || Math.max(competitors.length, 1),
        siteHealth: Math.min(100, 50 + Math.round(brandTrend / 2)),
      },
      aso: {
        aiVisibilityScore: brandTrend || 45,
        brandMentions: Math.max(1, Math.round(brandTrend / 3)),
      },
      competitors: competitorRows.length
        ? competitorRows
        : [{ name: "", traffic: 0, aiVisibility: 0, brandMentions: 0 }],
    },
    clarity: {
      platforms: clarityPlatforms,
      comparison: { analyzedAt: null, consensusCorrect: [] },
    },
    authority: {
      backlinksCount: backlinks || referringDomains * 6,
      citedPages: Math.max(referringDomains, Math.round(backlinks / 8)),
      sourcesCitingUs: domain ? [`https://${domain.replace(/^https?:\/\//, "")}`] : [],
      sourcesCitingCompetitorsOnly: [],
    },
    trust: {
      sentimentScore: clarityText.toLowerCase().includes("uncertain") ? 0.45 : 0.72,
      reviewCount: num(trustPayload?.reviews?.count, 0),
      averageRating: num(trustPayload?.reviews?.rating, 4.2),
      hedgedLanguageDetected: /may|might|possibly|unclear/i.test(clarityText),
    },
  };
}
