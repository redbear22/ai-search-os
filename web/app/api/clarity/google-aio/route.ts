import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-protection";
import {
  fetchGoogleAiOverview,
  formatOverviewAsClarityResponse,
} from "@/lib/google-ai-overviews";

async function handlePost(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      brandName?: string;
      query?: string;
      task?: string;
    };
    const brand = body.brandName?.trim() ?? "";
    const query =
      body.query?.trim() ||
      (brand ? `best ${brand} alternatives` : "");

    if (!query) {
      return NextResponse.json({ error: "brandName or query required" }, { status: 400 });
    }

    const result = await fetchGoogleAiOverview(query, brand);
    const response = formatOverviewAsClarityResponse(result);

    return NextResponse.json({
      success: true,
      response,
      hasOverview: result.hasOverview,
      brandMentioned: result.brandMentioned,
      sources: result.sources,
      message: result.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withApiAuth(handlePost);
