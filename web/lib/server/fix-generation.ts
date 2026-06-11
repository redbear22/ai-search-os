import "server-only";

import type { GapFix } from "@/types";
import type { Gap } from "@/types/gap";
import type { FixGenerationParams } from "@/lib/server/ai-prompts/templates";
import { runFixGenerationLlm } from "@/lib/server/ai-tasks";

export type FixGenerateInput = {
  /** Minimal gap description, e.g. "missing citation from techcrunch" */
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
};

/** @deprecated Use gap field */
export type LegacyFixGenerateInput = {
  description: string;
  context?: FixGenerateInput["context"];
};

function normalizeInput(
  input: FixGenerateInput | LegacyFixGenerateInput
): FixGenerationParams {
  if ("gap" in input && input.gap?.trim()) {
    return {
      gap: input.gap.trim(),
      title: input.context?.title,
      layer: input.context?.layer,
      severity: input.context?.severity,
      source: input.context?.source,
      suggestedOwner: input.context?.suggestedOwner,
      suggestedTimeline: input.context?.suggestedTimeline,
      brandName: input.context?.brandName,
      domain: input.context?.domain,
    };
  }

  const legacy = input as LegacyFixGenerateInput;
  return {
    gap: legacy.description?.trim() || "visibility gap",
    title: legacy.context?.title,
    layer: legacy.context?.layer,
    severity: legacy.context?.severity,
    source: legacy.context?.source,
    suggestedOwner: legacy.context?.suggestedOwner,
    suggestedTimeline: legacy.context?.suggestedTimeline,
    brandName: legacy.context?.brandName,
    domain: legacy.context?.domain,
  };
}

function rulesOnlyFix(params: FixGenerationParams): GapFix {
  const title = params.title ?? params.gap;
  const layer = params.layer ?? "general";
  return {
    action: `Address "${title}" (${layer}): ${params.gap.slice(0, 200)}. Prioritize measurable steps aligned with your ${params.suggestedOwner ?? "team"} owner.`,
    contentDraft: "",
    successMetrics: [
      "Gap status moves to in progress within 1 week",
      "Measurable KPI improvement within 30 days",
    ],
    resources: [params.suggestedOwner ?? "Content", "Analytics"],
    estimatedEffort: "4-8 hours",
  };
}

function parseFixContent(raw: string): GapFix {
  const trimmed = raw.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const parsed = JSON.parse(jsonBlock ?? trimmed) as Partial<GapFix>;

  if (!parsed.action || typeof parsed.action !== "string") {
    throw new Error("Invalid fix: missing action");
  }

  return {
    action: parsed.action,
    contentDraft: typeof parsed.contentDraft === "string" ? parsed.contentDraft : "",
    successMetrics: Array.isArray(parsed.successMetrics)
      ? parsed.successMetrics.filter((m): m is string => typeof m === "string")
      : [],
    resources: Array.isArray(parsed.resources)
      ? parsed.resources.filter((r): r is string => typeof r === "string")
      : [],
    estimatedEffort:
      typeof parsed.estimatedEffort === "string" ? parsed.estimatedEffort : "Unknown",
  };
}

export function fixInputFromGap(gap: Gap): FixGenerateInput {
  return {
    gap: gap.title,
    context: {
      title: gap.title,
      layer: gap.layer,
      severity: gap.severity,
      source: gap.source,
      suggestedOwner: gap.suggestedOwner,
      suggestedTimeline: gap.suggestedTimeline,
    },
  };
}

export async function generateFix(
  input: FixGenerateInput | LegacyFixGenerateInput
): Promise<GapFix> {
  const params = normalizeInput(input);
  if (!params.gap?.trim()) {
    throw new Error("gap is required");
  }

  try {
    const content = await runFixGenerationLlm(params);
    if (!content) {
      return rulesOnlyFix(params);
    }
    return parseFixContent(content);
  } catch {
    return rulesOnlyFix(params);
  }
}
