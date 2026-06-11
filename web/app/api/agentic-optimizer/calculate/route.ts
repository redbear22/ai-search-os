import { NextRequest, NextResponse } from "next/server";
import { getOptimizationRecommendations } from "@/lib/agentic-optimization";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const domain = typeof body.domain === "string" ? body.domain.trim() : "";
    const metrics = body.metrics ?? {};

    const strategies = await getOptimizationRecommendations(domain, metrics);

    return NextResponse.json({ success: true, strategies });
  } catch (error) {
    console.error("Agentic optimizer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
