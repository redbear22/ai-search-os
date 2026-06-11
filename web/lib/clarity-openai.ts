import type { AIPlatform } from "@/lib/audit-types";
import { PLATFORMS } from "@/lib/mock-audit";

export function buildClarityPrompt(brand: string, platform: AIPlatform): string {
  const label = PLATFORMS.find((p) => p.id === platform)?.label ?? platform;
  return `Analyze how the AI platform "${label}" would typically describe the brand "${brand}" in response to a user asking "What is ${brand}?" or "Tell me about ${brand}."

Provide a realistic response summary (2-4 paragraphs) as if captured from ${label}, then on separate lines list:
CORRECT: (comma-separated accurate claims)
WRONG: (comma-separated inaccurate or misleading claims, or "none")
MISSING: (comma-separated important omissions, or "none")`;
}

export interface ClarityQueryResult {
  responseText: string;
  correctItems: string[];
  wrongItems: string[];
  missingItems: string[];
  model: string;
}

function parseListLine(text: string, prefix: string): string[] {
  const line = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.toUpperCase().startsWith(prefix));
  if (!line) return [];
  const value = line.slice(line.indexOf(":") + 1).trim();
  if (!value || value.toLowerCase() === "none") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseClarityResponse(raw: string): Omit<ClarityQueryResult, "model"> {
  const correctItems = parseListLine(raw, "CORRECT");
  const wrongItems = parseListLine(raw, "WRONG");
  const missingItems = parseListLine(raw, "MISSING");

  let responseText = raw;
  const correctIdx = raw.toUpperCase().indexOf("CORRECT:");
  if (correctIdx > 0) {
    responseText = raw.slice(0, correctIdx).trim();
  }

  return { responseText, correctItems, wrongItems, missingItems };
}
