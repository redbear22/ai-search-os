/** Rules-first Google AI Overviews (SERP) fetch — no LLM required. */

export type GoogleAiOverviewResult = {
  hasOverview: boolean;
  overviewText: string;
  brandMentioned: boolean;
  sources: string[];
  query: string;
  message?: string;
};

const DEFAULT_DELAY_MS = 3000;
let lastFetchAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function brandMentioned(text: string, brand: string): boolean {
  if (!brand.trim()) return false;
  return text.toLowerCase().includes(brand.toLowerCase().trim());
}

function extractOverviewFromHtml(html: string): { text: string; sources: string[] } {
  const sources: string[] = [];

  // AI Overview block markers (Google SERP structure evolves — multiple heuristics)
  const overviewPatterns = [
    /data-attrid="wa:\/description"[^>]*>([\s\S]*?)<\//i,
    /class="[^"]*AIOverview[^"]*"[^>]*>([\s\S]*?)<\/div/i,
    /data-subtree="aimfl"[^>]*>([\s\S]*?)<\/div/i,
    /id="m-c"[^>]*>([\s\S]{200,8000}?)<\/div/i,
  ];

  let text = "";
  for (const pattern of overviewPatterns) {
    const m = html.match(pattern);
    if (m?.[1]) {
      text = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text.length > 80) break;
    }
  }

  const linkMatches = html.matchAll(/href="(https?:\/\/[^"]+)"/gi);
  for (const match of linkMatches) {
    const url = match[1];
    if (!url.includes("google.com") && !sources.includes(url)) {
      sources.push(url);
    }
    if (sources.length >= 8) break;
  }

  return { text, sources };
}

export async function fetchGoogleAiOverview(
  query: string,
  brand: string,
  delayMs = DEFAULT_DELAY_MS
): Promise<GoogleAiOverviewResult> {
  const q = query.trim();
  if (!q) {
    return {
      hasOverview: false,
      overviewText: "",
      brandMentioned: false,
      sources: [],
      query: q,
      message: "Query is required",
    };
  }

  const now = Date.now();
  const wait = Math.max(0, delayMs - (now - lastFetchAt));
  if (wait > 0) await sleep(wait);
  lastFetchAt = Date.now();

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=en&pws=0`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        hasOverview: false,
        overviewText: "",
        brandMentioned: false,
        sources: [],
        query: q,
        message: `Google returned HTTP ${res.status} — try again later or paste overview manually`,
      };
    }

    const html = await res.text();
    const { text, sources } = extractOverviewFromHtml(html);

    if (!text) {
      return {
        hasOverview: false,
        overviewText: "",
        brandMentioned: false,
        sources,
        query: q,
        message: "No AI Overview detected for this query",
      };
    }

    const mentioned = brandMentioned(text, brand);
    const response = [
      text,
      mentioned ? `\n\n✓ Brand "${brand}" mentioned in AI Overview.` : `\n\n✗ Brand "${brand}" not found in AI Overview.`,
      sources.length ? `\n\nSources cited: ${sources.slice(0, 5).join(", ")}` : "",
    ].join("");

    return {
      hasOverview: true,
      overviewText: text,
      brandMentioned: mentioned,
      sources,
      query: q,
      message: undefined,
    };
  } catch (err) {
    return {
      hasOverview: false,
      overviewText: "",
      brandMentioned: false,
      sources: [],
      query: q,
      message: err instanceof Error ? err.message : "Fetch blocked — paste overview manually",
    };
  }
}

export function formatOverviewAsClarityResponse(result: GoogleAiOverviewResult): string {
  if (!result.hasOverview) {
    return result.message ?? "No AI Overview for this query.";
  }
  const lines = [result.overviewText];
  if (result.brandMentioned) {
    lines.push("Brand appears in AI Overview.");
  } else {
    lines.push("Brand does NOT appear in AI Overview.");
  }
  if (result.sources.length) {
    lines.push(`Sources: ${result.sources.slice(0, 5).join("; ")}`);
  }
  return lines.join("\n\n");
}
