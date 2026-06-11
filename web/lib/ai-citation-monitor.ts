export interface CitationCheck {
  id: string;
  query: string;
  platform: "perplexity" | "chatgpt" | "claude" | "gemini";
  brandName: string;
  competitors: string[];
  brandsCited: string[];
  brandCited: boolean;
  competitorCited: string[];
  citedSources: string[];
  timestamp: string;
}

export interface CitationGap {
  query: string;
  platform: string;
  competitorCited: string;
  citationUrl?: string;
  severity: "high" | "medium" | "low";
}

interface ParsedCitationResponse {
  brandsCited: string[];
  citedSources: string[];
  fullResponse: string;
}

interface ClarityApiResponse {
  response?: string;
  error?: string;
}

const CACHE_KEY = "citation_monitor_cache";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function getAppBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function getCached(key: string): CitationCheck | null {
  if (typeof window === "undefined") return null;
  const cached = localStorage.getItem(`${CACHE_KEY}_${key}`);
  if (!cached) return null;
  const { data, timestamp } = JSON.parse(cached) as {
    data: CitationCheck;
    timestamp: number;
  };
  if (Date.now() - timestamp < CACHE_TTL) return data;
  return null;
}

function setCached(key: string, data: CitationCheck): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    `${CACHE_KEY}_${key}`,
    JSON.stringify({
      data,
      timestamp: Date.now(),
    })
  );
}

export async function checkCitation(
  query: string,
  brandName: string,
  competitors: string[],
  platform: CitationCheck["platform"] = "perplexity"
): Promise<CitationCheck> {
  const cacheKey = `${platform}_${query}_${brandName}_${competitors.join("_")}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let endpoint = "";
  let body: Record<string, string> = {
    query,
    brandName,
    task: "citation_search",
  };

  switch (platform) {
    case "perplexity":
      endpoint = "/api/clarity/perplexity";
      break;
    case "chatgpt":
      endpoint = "/api/clarity/openai";
      body = { query, brandName, task: "citation_search", model: "gpt-4o-mini" };
      break;
    case "claude":
      endpoint = "/api/clarity/claude";
      break;
    case "gemini":
      endpoint = "/api/clarity/gemini";
      break;
  }

  try {
    const response = await fetch(`${getAppBaseUrl()}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as ClarityApiResponse;

    if (!response.ok || !data.response) {
      throw new Error(data.error ?? `Citation check failed (${response.status})`);
    }

    let parsed: ParsedCitationResponse;
    try {
      const json = JSON.parse(data.response) as Partial<ParsedCitationResponse>;
      parsed = {
        brandsCited: json.brandsCited ?? [],
        citedSources: json.citedSources ?? [],
        fullResponse: json.fullResponse ?? data.response,
      };
    } catch {
      parsed = {
        brandsCited: extractBrands(data.response, [brandName, ...competitors]),
        citedSources: extractSources(data.response),
        fullResponse: data.response,
      };
    }

    const brandCited = parsed.brandsCited.some((b) =>
      b.toLowerCase().includes(brandName.toLowerCase())
    );

    const competitorCited = competitors.filter((c) =>
      parsed.brandsCited.some((b) => b.toLowerCase().includes(c.toLowerCase()))
    );

    const result: CitationCheck = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      query,
      platform,
      brandName,
      competitors,
      brandsCited: parsed.brandsCited,
      brandCited,
      competitorCited,
      citedSources: parsed.citedSources || [],
      timestamp: new Date().toISOString(),
    };

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Citation check failed for ${platform}:`, error);
    throw error;
  }
}

function extractBrands(text: string, knownBrands: string[]): string[] {
  const found: string[] = [];
  for (const brand of knownBrands) {
    if (text.toLowerCase().includes(brand.toLowerCase())) {
      found.push(brand);
    }
  }
  return found;
}

function extractSources(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s)]+/g;
  return text.match(urlRegex) || [];
}

export async function runBatchCitationCheck(
  queries: string[],
  brandName: string,
  competitors: string[],
  onProgress?: (current: number, total: number) => void
): Promise<CitationCheck[]> {
  const results: CitationCheck[] = [];
  const platforms: CitationCheck["platform"][] = [
    "perplexity",
    "chatgpt",
    "claude",
    "gemini",
  ];

  let completed = 0;
  const total = queries.length * platforms.length;

  for (const query of queries) {
    for (const platform of platforms) {
      try {
        const result = await checkCitation(
          query,
          brandName,
          competitors,
          platform
        );
        results.push(result);
      } catch (error) {
        console.error(`Failed for ${platform} on "${query}":`, error);
      }
      completed++;
      onProgress?.(completed, total);
    }
  }

  return results.sort((a, b) => {
    const aGaps = a.competitorCited.length;
    const bGaps = b.competitorCited.length;
    if (aGaps !== bGaps) return bGaps - aGaps;
    return a.brandCited === b.brandCited ? 0 : a.brandCited ? 1 : -1;
  });
}

export function identifyCitationGaps(results: CitationCheck[]): CitationGap[] {
  const gaps: CitationGap[] = [];

  for (const result of results) {
    if (!result.brandCited && result.competitorCited.length > 0) {
      for (const competitor of result.competitorCited) {
        gaps.push({
          query: result.query,
          platform: result.platform,
          competitorCited: competitor,
          citationUrl: result.citedSources[0],
          severity: result.competitorCited.length > 2 ? "high" : "medium",
        });
      }
    }
  }

  return gaps;
}
