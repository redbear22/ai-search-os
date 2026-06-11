export type TrendSource = "google" | "youtube" | "tiktok" | "reddit" | "amazon" | "wikipedia";

export interface TrendData {
  keyword: string;
  score: number;
  source: TrendSource;
  timestamp: string;
}

export interface TrendGap {
  topic: string;
  brandScore: number;
  competitorScore: number;
  source: TrendSource;
  gap: number;
}

export interface VelocityPoint {
  date: string;
  score: number;
}

const SOURCE_API_MAP: Record<TrendSource, string> = {
  google: "google search",
  youtube: "youtube",
  tiktok: "tiktok",
  reddit: "reddit",
  amazon: "amazon",
  wikipedia: "wikipedia",
};

function getBaseUrl(): string {
  const raw =
    process.env.TRENDS_MCP_API_URL ||
    process.env.TRENDS_MCP_URL ||
    "https://api.trendsmcp.ai/api";
  const trimmed = raw.replace(/\/$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

function getApiKey(): string | undefined {
  return process.env.TRENDS_MCP_API_KEY;
}

interface TrendsPoint {
  date?: string;
  value?: number;
  keyword?: string;
  source?: string;
}

function normalizePoints(payload: unknown): TrendsPoint[] {
  if (Array.isArray(payload)) return payload as TrendsPoint[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as TrendsPoint[];
    if (Array.isArray(obj.series)) return obj.series as TrendsPoint[];
    if (Array.isArray(obj.results)) return obj.results as TrendsPoint[];
  }
  return [];
}

function apiSourceToTrendSource(apiSource: string): TrendSource {
  const lower = apiSource.toLowerCase();
  if (lower.includes("youtube")) return "youtube";
  if (lower.includes("tiktok")) return "tiktok";
  if (lower.includes("reddit")) return "reddit";
  if (lower.includes("amazon")) return "amazon";
  if (lower.includes("wikipedia")) return "wikipedia";
  return "google";
}

function trendSourceToApi(source: string): string {
  const key = source as TrendSource;
  return SOURCE_API_MAP[key] ?? SOURCE_API_MAP.google;
}

async function trendsRequest(body: Record<string, unknown>): Promise<unknown> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Trends MCP API key not configured. Add TRENDS_MCP_API_KEY to .env.local");
  }

  const res = await fetch(getBaseUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Trends MCP returned ${res.status}`);
  }

  return res.json();
}

function mockTrendData(keywords: string[], sources: string[]): TrendData[] {
  const now = new Date().toISOString();
  return keywords.flatMap((keyword, ki) =>
    sources.map((source, si) => ({
      keyword,
      score: Math.min(100, 35 + ((ki + 1) * 11 + (si + 1) * 7) % 55),
      source: apiSourceToTrendSource(source),
      timestamp: now,
    }))
  );
}

/** Server-side: fetch latest normalized scores per keyword × source */
export async function fetchTrendData(
  keywords: string[],
  sources: string[] = ["google", "youtube"]
): Promise<TrendData[]> {
  if (!keywords.length) return [];

  if (!getApiKey()) {
    return mockTrendData(keywords, sources);
  }

  const results: TrendData[] = [];

  await Promise.all(
    keywords.flatMap((keyword) =>
      sources.map(async (source) => {
        try {
          const payload = await trendsRequest({
            source: trendSourceToApi(source),
            keyword,
            data_mode: "weekly",
          });
          const points = normalizePoints(payload);
          const latest = points[points.length - 1];
          if (!latest) return;
          results.push({
            keyword,
            score: Math.round(Math.min(100, latest.value ?? 0)),
            source: apiSourceToTrendSource(latest.source ?? trendSourceToApi(source)),
            timestamp: latest.date ?? new Date().toISOString(),
          });
        } catch {
          // skip failed keyword/source pairs
        }
      })
    )
  );

  return results.length ? results : mockTrendData(keywords, sources);
}

/** Server-side: topics where competitors outperform the brand */
export async function detectTrendingTopics(
  domain: string,
  competitors: string[]
): Promise<TrendGap[]> {
  const brand = domain.trim();
  const rivals = competitors.map((c) => c.trim()).filter(Boolean);
  if (!brand || !rivals.length) return [];

  const allKeywords = [brand, ...rivals];
  const trends = await fetchTrendData(allKeywords, ["google", "youtube", "reddit"]);

  const byKeyword = new Map<string, TrendData[]>();
  for (const t of trends) {
    const list = byKeyword.get(t.keyword) ?? [];
    list.push(t);
    byKeyword.set(t.keyword, list);
  }

  const brandTrends = byKeyword.get(brand) ?? [];
  const gaps: TrendGap[] = [];

  for (const competitor of rivals) {
    const compTrends = byKeyword.get(competitor) ?? [];
    for (const comp of compTrends) {
      const brandMatch = brandTrends.find((b) => b.source === comp.source);
      const brandScore = brandMatch?.score ?? 0;
      if (comp.score > brandScore + 5) {
        gaps.push({
          topic: competitor,
          brandScore,
          competitorScore: comp.score,
          source: comp.source,
          gap: comp.score - brandScore,
        });
      }
    }
  }

  return gaps.sort((a, b) => b.gap - a.gap);
}

/** Server-side: daily velocity series for content gap analysis */
export async function getTopicVelocity(
  topic: string,
  days = 30
): Promise<VelocityPoint[]> {
  const keyword = topic.trim();
  if (!keyword) return [];

  if (!getApiKey()) {
    const now = Date.now();
    return Array.from({ length: Math.min(days, 14) }, (_, i) => ({
      date: new Date(now - (days - i) * 86400000).toISOString().slice(0, 10),
      score: 30 + Math.round(Math.sin(i / 2) * 15 + i * 2),
    }));
  }

  try {
    const payload = await trendsRequest({
      source: "google search",
      keyword,
      data_mode: "daily",
    });
    const points = normalizePoints(payload);
    const sliced = points.slice(-days);
    return sliced.map((p) => ({
      date: p.date ?? "",
      score: Math.round(Math.min(100, p.value ?? 0)),
    }));
  } catch {
    return [];
  }
}

// —— Client helpers (call Next.js API routes) ——

export async function fetchTrendDataClient(
  keywords: string[],
  sources: string[] = ["google", "youtube"]
): Promise<TrendData[]> {
  const res = await fetch("/api/trends/fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords, sources }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch trends");
  return data.trends as TrendData[];
}

export async function detectTrendingTopicsClient(
  domain: string,
  competitors: string[]
): Promise<TrendGap[]> {
  const res = await fetch("/api/trends/gaps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, competitors }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to detect trend gaps");
  return data.gaps as TrendGap[];
}

export async function getTopicVelocityClient(
  topic: string,
  days = 30
): Promise<VelocityPoint[]> {
  const res = await fetch("/api/trends/velocity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, days }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch topic velocity");
  return data.velocity as VelocityPoint[];
}
