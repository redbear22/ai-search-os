import type { AuditData } from "@/lib/audit-types";
import type { GapFix } from "@/types";
import type { Gap, GapSummary } from "@/types/gap";

export type DetectGapsResponse = {
  success: boolean;
  gaps: Gap[];
  count: number;
  severityScoring: {
    aggregateSeverity: number;
    priorityScore: number;
    bySeverity: GapSummary["bySeverity"];
  };
  error?: string;
};

export type GenerateFixResponse = {
  success: boolean;
  fix?: GapFix;
  error?: string;
};

export type CitationScoreResponse = {
  success: boolean;
  normalizedScore?: number;
  citedRate?: number;
  citationCount?: number;
  authorityWeight?: number;
  breakdown?: Array<{ key: string; score: number; weight: number; cited: boolean }>;
  error?: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function detectGapsRemote(auditData: AuditData): Promise<DetectGapsResponse> {
  const response = await fetch("/api/gaps/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auditData }),
  });
  const data = await parseJson<DetectGapsResponse>(response);
  if (!response.ok) {
    throw new Error(data.error ?? "Gap detection failed");
  }
  return data;
}

export async function generateFixRemote(input: {
  gap: string;
  context?: {
    title?: string;
    layer?: string;
    severity?: string;
    source?: string;
    suggestedOwner?: string;
    suggestedTimeline?: number;
    brandName?: string;
    domain?: string;
  };
}): Promise<GapFix> {
  const response = await fetch("/api/fixes/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<GenerateFixResponse>(response);
  if (!response.ok || !data.success || !data.fix) {
    throw new Error(data.error ?? "Fix generation failed");
  }
  return data.fix;
}

export async function scoreCitationRemote(input: {
  citations: Array<{
    platform?: string;
    publication?: string;
    cited?: boolean;
    confidenceScore?: number;
    query?: string;
    citationUrl?: string;
  }>;
  brandName?: string;
}): Promise<CitationScoreResponse> {
  const response = await fetch("/api/citation/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<CitationScoreResponse>(response);
  if (!response.ok) {
    throw new Error(data.error ?? "Citation scoring failed");
  }
  return data;
}
