import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  clarityCacheKey,
  getCachedResponse,
  setCachedResponse,
} from "@/lib/api-cache";
import {
  clarityCacheSeed,
  rejectRawPrompt,
  runClarityQuery,
  type ClarityQueryInput,
} from "@/lib/server/ai-tasks";

const CACHE_TTL = 3600;

function parseClarityBody(body: unknown): ClarityQueryInput {
  rejectRawPrompt(body);

  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const record = body as Record<string, unknown>;
  return {
    brandName: typeof record.brandName === "string" ? record.brandName.trim() : undefined,
    query: typeof record.query === "string" ? record.query.trim() : undefined,
    task:
      record.task === "brand_overview" ||
      record.task === "brand_short" ||
      record.task === "citation_search"
        ? record.task
        : undefined,
    competitors: Array.isArray(record.competitors)
      ? record.competitors.filter((c): c is string => typeof c === "string")
      : undefined,
    model: typeof record.model === "string" ? record.model : undefined,
  };
}

export async function handleClarityPost(
  request: NextRequest,
  platform: string,
  defaultModel?: string
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const input = parseClarityBody(body);
    if (defaultModel && !input.model) {
      input.model = defaultModel;
    }

    const cacheKey = clarityCacheKey(
      platform,
      clarityCacheSeed(input, platform),
      input.model
    );
    const cached = getCachedResponse<{
      success: true;
      response: string;
      model?: string;
    }>(cacheKey, CACHE_TTL);

    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    const response = await runClarityQuery(platform, input);
    const payload = {
      success: true as const,
      response,
      ...(input.model ? { model: input.model } : {}),
    };

    setCachedResponse(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("not configured")
      ? 500
      : message.includes("required") || message.includes("not accepted")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
