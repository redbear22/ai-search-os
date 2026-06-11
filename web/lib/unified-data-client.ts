import "server-only";

import OpenAI from "openai";
import axios from "axios";
import { loadRootEnvFallback } from "@/lib/load-root-env";
import {
  detectTrendingTopics,
  fetchTrendData as fetchTrendDataRaw,
  type TrendData,
  type TrendGap,
} from "@/lib/trends-mcp-client";
import type { DataResult, UnifiedAuditResult } from "@/lib/unified-audit-types";

export type { DataResult, UnifiedAuditResult } from "@/lib/unified-audit-types";

// ============================================
// Configuration
// ============================================

let envLoaded = false;

function ensureEnv(): void {
  if (envLoaded) return;
  loadRootEnvFallback();
  envLoaded = true;
}

function getOpenAI(): OpenAI | null {
  ensureEnv();
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function cfg() {
  ensureEnv();
  return {
    dataforseoLogin: process.env.DATAFORSEO_LOGIN?.trim(),
    dataforseoPassword: process.env.DATAFORSEO_PASSWORD?.trim(),
    dataforseoUrl:
      process.env.DATAFORSEO_API_URL?.trim() || "https://api.dataforseo.com/v3",
    locationCode: Number(process.env.DATAFORSEO_LOCATION_CODE || 2840),
    languageCode: process.env.DATAFORSEO_LANGUAGE_CODE?.trim() || "en",
    keUrl:
      process.env.KEYWORDS_EVERYWHERE_API_URL?.trim() ||
      "https://api.keywordseverywhere.com/v1",
    keKey: process.env.KEYWORDS_EVERYWHERE_API_KEY?.trim(),
    keCountry: process.env.KE_DEFAULT_COUNTRY?.trim() || "us",
    keCurrency: process.env.KE_DEFAULT_CURRENCY?.trim() || "usd",
    keepaUrl: process.env.KEEPA_API_URL?.trim() || "https://api.keepa.com",
    keepaKey: process.env.KEEPA_API_KEY?.trim(),
  };
}

function dataforseoAuth(): string | null {
  const { dataforseoLogin, dataforseoPassword } = cfg();
  if (!dataforseoLogin || !dataforseoPassword) return null;
  return Buffer.from(`${dataforseoLogin}:${dataforseoPassword}`).toString("base64");
}

// ============================================
// Caching (7-day TTL — in-memory, server-side)
// ============================================

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const cache = new Map<string, { data: unknown; timestamp: number }>();

export function clearUnifiedDataCache(): void {
  cache.clear();
}

async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  forceRefresh = false
): Promise<T> {
  if (!forceRefresh) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data as T;
    }
  }
  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

function mockKeywordMetrics(keywords: string[]) {
  return keywords.map((keyword, i) => ({
    keyword,
    vol: 1200 + i * 340,
    cpc: { currency: "USD", value: Number((1.2 + i * 0.15).toFixed(2)) },
    competition: 0.35 + (i % 5) * 0.08,
  }));
}

function mockBacklinks(domain: string) {
  return {
    target: domain,
    total_backlinks: 1240,
    referring_domains: 186,
    rank: 42,
    mock: true,
  };
}

function mockKeepaProduct(asin: string) {
  return {
    asin,
    title: `Demo product (${asin})`,
    reviews: { count: 128, rating: 4.3 },
    mock: true,
  };
}

// ============================================
// 1. CLARITY — OpenAI
// ============================================

export async function queryBrandPerception(
  brandName: string,
  platform = "openai",
  forceRefresh = false
): Promise<DataResult<string>> {
  const cacheKey = `clarity_${brandName}_${platform}`;

  const text = await getCachedOrFetch(
    cacheKey,
    async () => {
      const openai = getOpenAI();
      if (!openai) {
        return `[Mock] ${brandName} is known in its category. Configure OPENAI_API_KEY for live clarity queries.`;
      }

      const { runClarityQuery } = await import("@/lib/server/ai-tasks");
      return runClarityQuery("openai", {
        brandName,
        task: "brand_overview",
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      });
    },
    forceRefresh
  );

  const mock = !getOpenAI();
  return { data: text, source: mock ? "mock" : "openai", mock };
}

// ============================================
// 2. DISCOVERABILITY — Keywords Everywhere → DataForSEO
// ============================================

export async function fetchKeywordMetrics(
  keywords: string[],
  forceRefresh = false
): Promise<DataResult<unknown>> {
  const cacheKey = `keywords_${keywords.join("_")}`;
  const { keUrl, keKey, keCountry, keCurrency, dataforseoUrl, locationCode, languageCode } =
    cfg();

  const data = await getCachedOrFetch(
    cacheKey,
    async () => {
      if (keKey) {
        try {
          const response = await axios.post(
            `${keUrl.replace(/\/$/, "")}/get_keyword_data`,
            {
              country: keCountry,
              currency: keCurrency,
              dataSource: "gkp",
              kw: keywords,
            },
            {
              headers: {
                Authorization: `Bearer ${keKey}`,
                Accept: "application/json",
              },
              timeout: 15000,
            }
          );
          return { payload: response.data, provider: "keywords_everywhere" as const };
        } catch (error) {
          console.warn("Keywords Everywhere failed, falling back to DataForSEO", error);
        }
      }

      const auth = dataforseoAuth();
      if (auth) {
        try {
          const response = await axios.post(
            `${dataforseoUrl.replace(/\/$/, "")}/keywords_data/google_ads/search_volume/live`,
            [
              {
                keywords,
                location_code: locationCode,
                language_code: languageCode,
              },
            ],
            {
              headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
              },
              timeout: 20000,
            }
          );
          return { payload: response.data, provider: "dataforseo" as const };
        } catch (error) {
          console.warn("DataForSEO keyword metrics failed", error);
        }
      }

      return {
        payload: { data: mockKeywordMetrics(keywords) },
        provider: "mock" as const,
      };
    },
    forceRefresh
  );

  const result = data as {
    payload: unknown;
    provider: "keywords_everywhere" | "dataforseo" | "mock";
  };

  return {
    data: result.payload,
    source: result.provider,
    mock: result.provider === "mock",
    fallbackFrom: result.provider === "dataforseo" ? "keywords_everywhere" : undefined,
  };
}

export async function fetchRankings(
  domain: string,
  keywords: string[],
  forceRefresh = false
): Promise<DataResult<unknown>> {
  const cacheKey = `rankings_${domain}_${keywords.join("_")}`;
  const { dataforseoUrl, locationCode, languageCode } = cfg();

  const data = await getCachedOrFetch(
    cacheKey,
    async () => {
      const auth = dataforseoAuth();
      if (!auth) {
        return {
          payload: {
            domain,
            keywords: keywords.map((kw, i) => ({
              keyword: kw,
              rank: i + 3,
              url: `https://${domain}/${kw.replace(/\s+/g, "-")}`,
            })),
          },
          provider: "mock" as const,
        };
      }

      const response = await axios.post(
        `${dataforseoUrl.replace(/\/$/, "")}/serp/google/organic/live/advanced`,
        keywords.map((keyword) => ({
          keyword,
          location_code: locationCode,
          language_code: languageCode,
          device: "desktop",
          depth: 10,
        })),
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          timeout: 25000,
        }
      );
      return { payload: response.data, provider: "dataforseo" as const };
    },
    forceRefresh
  );

  const result = data as { payload: unknown; provider: "dataforseo" | "mock" };
  return {
    data: result.payload,
    source: result.provider,
    mock: result.provider === "mock",
  };
}

// ============================================
// 3. DISCOVERABILITY + CLARITY — Trends MCP
// ============================================

export async function fetchTrendData(
  keywords: string[],
  forceRefresh = false
): Promise<DataResult<TrendData[]>> {
  const cacheKey = `trends_${keywords.join("_")}`;

  const trends = await getCachedOrFetch(
    cacheKey,
    () => fetchTrendDataRaw(keywords, ["google", "youtube"]),
    forceRefresh
  );

  const mock = !process.env.TRENDS_MCP_API_KEY?.trim();
  return { data: trends, source: mock ? "mock" : "trends_mcp", mock };
}

export async function detectContentGaps(
  domain: string,
  competitors: string[],
  forceRefresh = false
): Promise<DataResult<TrendGap[]>> {
  const cacheKey = `gaps_${domain}_${competitors.join("_")}`;

  const gaps = await getCachedOrFetch(
    cacheKey,
    () => detectTrendingTopics(domain, competitors),
    forceRefresh
  );

  const mock = !process.env.TRENDS_MCP_API_KEY?.trim();
  return { data: gaps, source: mock ? "mock" : "trends_mcp", mock };
}

// ============================================
// 4. AUTHORITY — DataForSEO Backlinks
// ============================================

export async function fetchBacklinks(
  domain: string,
  forceRefresh = false
): Promise<DataResult<unknown>> {
  const cacheKey = `backlinks_${domain}`;
  const { dataforseoUrl } = cfg();

  const data = await getCachedOrFetch(
    cacheKey,
    async () => {
      const auth = dataforseoAuth();
      if (!auth) {
        return { payload: mockBacklinks(domain), provider: "mock" as const };
      }

      try {
        const response = await axios.post(
          `${dataforseoUrl.replace(/\/$/, "")}/backlinks/summary/live`,
          [{ target: domain, include_subdomains: true }],
          {
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/json",
            },
            timeout: 25000,
          }
        );
        return { payload: response.data, provider: "dataforseo" as const };
      } catch (error) {
        console.warn("DataForSEO backlinks failed, using mock", error);
        return { payload: mockBacklinks(domain), provider: "mock" as const };
      }
    },
    forceRefresh
  );

  const result = data as { payload: unknown; provider: "dataforseo" | "mock" };
  return {
    data: result.payload,
    source: result.provider,
    mock: result.provider === "mock",
  };
}

// ============================================
// 5. TRUST — Keepa
// ============================================

export async function fetchProductReviews(
  asin: string,
  forceRefresh = false
): Promise<DataResult<unknown>> {
  const cacheKey = `reviews_${asin}`;
  const { keepaUrl, keepaKey } = cfg();

  const data = await getCachedOrFetch(
    cacheKey,
    async () => {
      if (!keepaKey) {
        return { payload: mockKeepaProduct(asin), provider: "mock" as const };
      }

      try {
        const response = await axios.get(`${keepaUrl.replace(/\/$/, "")}/product`, {
          params: {
            key: keepaKey,
            asin,
            domain: 1,
            stats: 1,
            history: 0,
          },
          timeout: 20000,
        });
        return { payload: response.data, provider: "keepa" as const };
      } catch (error) {
        console.warn("Keepa product fetch failed, using mock", error);
        return { payload: mockKeepaProduct(asin), provider: "mock" as const };
      }
    },
    forceRefresh
  );

  const result = data as { payload: unknown; provider: "keepa" | "mock" };
  return {
    data: result.payload,
    source: result.provider,
    mock: result.provider === "mock",
  };
}

// ============================================
// 6. UNIFIED AUDIT
// ============================================

export async function runUnifiedAudit(
  brandName: string,
  domain: string,
  competitors: string[],
  options?: { asin?: string; forceRefresh?: boolean }
): Promise<UnifiedAuditResult> {
  ensureEnv();
  const forceRefresh = options?.forceRefresh ?? false;
  const keywords = [brandName, ...competitors].filter(Boolean);

  const results: UnifiedAuditResult = {
    clarity: null,
    discoverability: { keywords: null, rankings: null, trends: null },
    authority: null,
    trust: null,
    contentGaps: null,
    errors: [],
  };

  const settled = await Promise.allSettled([
    queryBrandPerception(brandName, "openai", forceRefresh).then((r) => {
      results.clarity = r;
    }),
    fetchKeywordMetrics(keywords, forceRefresh).then((r) => {
      results.discoverability.keywords = r;
    }),
    fetchRankings(domain, keywords, forceRefresh).then((r) => {
      results.discoverability.rankings = r;
    }),
    fetchTrendData(keywords, forceRefresh).then((r) => {
      results.discoverability.trends = r;
    }),
    fetchBacklinks(domain, forceRefresh).then((r) => {
      results.authority = r;
    }),
    detectContentGaps(domain, competitors, forceRefresh).then((r) => {
      results.contentGaps = r;
    }),
    options?.asin
      ? fetchProductReviews(options.asin, forceRefresh).then((r) => {
          results.trust = r;
        })
      : Promise.resolve(),
  ]);

  for (const outcome of settled) {
    if (outcome.status === "rejected") {
      const msg = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      results.errors.push(msg);
    }
  }

  return results;
}
