/** Shared heuristics for filtering placeholder audit data from gap detection. */

const PLACEHOLDER_COMPETITOR_NAMES = new Set(["competitor1.com", "competitor2.com"]);

export function normalizeCompetitorName(name: string): string {
  return name.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

export function isPlaceholderCompetitor(name: string): boolean {
  const normalized = normalizeCompetitorName(name);
  if (!normalized) return true;
  if (PLACEHOLDER_COMPETITOR_NAMES.has(normalized)) return true;
  if (normalized.startsWith("competitor-of-")) return true;
  return /^competitor\d+\.com$/.test(normalized);
}

export function filterRealCompetitors(competitors: string[]): string[] {
  return competitors.map((c) => c.trim()).filter((c) => c && !isPlaceholderCompetitor(c));
}

export function isMockTrendMissingItem(item: string): boolean {
  return item.trim().startsWith("Trending topic:");
}

export function isMockClarityResponse(text: string): boolean {
  return text.trim().startsWith("[Mock]");
}

export function isInventedCompetitorCitationSource(source: string): boolean {
  const normalized = source.trim().toLowerCase().replace(/^https?:\/\//, "");
  const host = normalized.split("/")[0] ?? "";
  return isPlaceholderCompetitor(host);
}
