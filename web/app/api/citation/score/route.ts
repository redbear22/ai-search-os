import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withApiProtection } from "@/lib/api-protection";
import { scoreCitations, type CitationScoreInput } from "@/lib/server/citation-score";

export const dynamic = "force-dynamic";

function parseInput(body: unknown): CitationScoreInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.citations)) return null;
  return {
    citations: record.citations as CitationScoreInput["citations"],
    brandName: typeof record.brandName === "string" ? record.brandName : undefined,
  };
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const input = parseInput(body);

    if (!input || input.citations.length === 0) {
      return NextResponse.json(
        { error: "citations array is required" },
        { status: 400 }
      );
    }

    const result = scoreCitations(input);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Citation score error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const POST = withApiProtection(handlePost, { critical: true });
