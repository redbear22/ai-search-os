/** Citation Engine REST is optional — Streamlit on :8501 is not an API; REST is :8510. */
const CE_ENABLED = process.env.CITATION_ENGINE_ENABLED === "true";
const CE_BASE = process.env.CITATION_ENGINE_URL ?? "http://localhost:8510";
const TIMEOUT_MS = 5000;

export const MOCK_SOURCES_CITING_US = [
  "seriouseats.com/reviews/best-espresso-machines",
  "wirecutter.com/reviews/best-espresso-machine",
  "reddit.com/r/espresso/wiki",
];

export const MOCK_COMPETITOR_SOURCES = [
  "tomsguide.com/best-espresso-machines",
  "cnet.com/home/kitchen-and-household/best-espresso-machines",
];

export interface CitationEngineResponse {
  sources: string[];
  mock: boolean;
  error?: string;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeSources(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const raw = obj.sources ?? obj.urls ?? obj.data;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") return item.trim();
    if (item && typeof item === "object" && "url" in item) {
      return String((item as { url: string }).url).trim();
    }
    return "";
  }).filter(Boolean);
}

export async function fetchCitationEngineSources(
  path: "sources/citing-us" | "sources/competitor-only",
  mockFallback: string[]
): Promise<CitationEngineResponse> {
  if (!CE_ENABLED) {
    return {
      sources: mockFallback,
      mock: true,
      error: "Citation Engine API disabled — using mock data",
    };
  }

  const url = `${CE_BASE}/api/${path}`;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      throw new Error(`Citation Engine returned ${res.status}`);
    }
    const json = await res.json();
    const sources = normalizeSources(json);
    if (!sources.length) {
      return {
        sources: mockFallback,
        mock: true,
        error: "Empty response from Citation Engine — using mock data",
      };
    }
    return { sources, mock: false };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Citation Engine timed out after 5s"
          : err.message
        : "Citation Engine unreachable";
    return {
      sources: mockFallback,
      mock: true,
      error: `${message} — using mock data`,
    };
  }
}
