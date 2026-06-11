import "server-only";

import {
  buildUserPrompt,
  clarityTaskFromInput,
  getSystemPrompt,
  type AiTask,
  type ClarityProvider,
  type ContentOutlineParams,
  type ExecutiveSummaryParams,
  type FixGenerationParams,
  type OutreachPitchParams,
} from "@/lib/server/ai-prompts/templates";
import { completeWithProvider, mapPlatformToProvider } from "@/lib/server/ai-gateway";

export type ClarityQueryInput = {
  brandName?: string;
  query?: string;
  task?: "brand_overview" | "brand_short" | "citation_search";
  competitors?: string[];
  model?: string;
};

export function rejectRawPrompt(body: unknown): void {
  if (body && typeof body === "object" && "prompt" in body) {
    throw new Error(
      "Raw prompts are not accepted. Send minimal parameters (e.g. brandName, gap, query)."
    );
  }
}

export async function runClarityQuery(
  platform: string,
  input: ClarityQueryInput
): Promise<string> {
  rejectRawPrompt(input);

  const provider = mapPlatformToProvider(platform);
  const task = clarityTaskFromInput({
    task: input.task,
    brandName: input.brandName,
    query: input.query,
  });

  const params: Record<string, unknown> = {
    brandName: input.brandName ?? "",
    query: input.query ?? input.brandName ?? "",
    competitors: input.competitors ?? [],
  };

  if (task === "citation_search" && !input.query?.trim()) {
    throw new Error("query is required for citation_search task");
  }

  if (task !== "citation_search" && !input.brandName?.trim()) {
    throw new Error("brandName is required");
  }

  const system = getSystemPrompt(task, provider);
  const user = buildUserPrompt(task, params);

  return completeWithProvider(provider, {
    system,
    user,
    model: input.model,
    temperature: task === "citation_search" ? 0.2 : 0.3,
    maxTokens: task === "citation_search" ? 800 : 500,
  });
}

export async function runOpenAiTask(
  task: AiTask,
  params: Record<string, unknown>,
  options?: { jsonMode?: boolean; maxTokens?: number; temperature?: number }
): Promise<string> {
  const system = getSystemPrompt(task);
  const user = buildUserPrompt(task, params);

  return completeWithProvider("openai", {
    system,
    user,
    jsonMode: options?.jsonMode,
    maxTokens: options?.maxTokens,
    temperature: options?.temperature,
  });
}

export async function runOutreachPitch(
  params: OutreachPitchParams,
  fallback: string
): Promise<string> {
  try {
    const text = await runOpenAiTask("outreach_pitch", params, {
      temperature: 0.6,
      maxTokens: 600,
    });
    return text || fallback;
  } catch {
    return fallback;
  }
}

export async function runContentOutline(
  params: ContentOutlineParams,
  fallback: string
): Promise<string> {
  try {
    const text = await runOpenAiTask("content_outline", params, {
      temperature: 0.6,
      maxTokens: 800,
    });
    return text || fallback;
  } catch {
    return fallback;
  }
}

export async function runExecutiveSummary(
  params: ExecutiveSummaryParams,
  fallback: string
): Promise<string> {
  try {
    const text = await runOpenAiTask("executive_summary", params, {
      temperature: 0.5,
      maxTokens: 250,
    });
    return text || fallback;
  } catch {
    return fallback;
  }
}

export async function runFixGenerationLlm(params: FixGenerationParams): Promise<string> {
  return runOpenAiTask("fix_generation", params, {
    jsonMode: true,
    temperature: 0.7,
    maxTokens: 1000,
  });
}

export function clarityCacheSeed(input: ClarityQueryInput, platform: string): string {
  return JSON.stringify({
    platform,
    task: input.task ?? clarityTaskFromInput(input),
    brandName: input.brandName ?? "",
    query: input.query ?? "",
  });
}
