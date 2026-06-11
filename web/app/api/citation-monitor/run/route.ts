import { NextRequest, NextResponse } from "next/server";
import {
  runBatchCitationCheck,
  identifyCitationGaps,
} from "@/lib/ai-citation-monitor";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { queries, brandName, competitors } = await request.json();

    if (!queries?.length || !brandName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const results = await runBatchCitationCheck(
      queries,
      brandName,
      competitors || [],
      (current, total) => {
        console.log(`Citation monitor progress: ${current}/${total}`);
      }
    );

    const gaps = identifyCitationGaps(results);

    return NextResponse.json({
      success: true,
      totalChecked: results.length,
      gapsFound: gaps.length,
      results,
      gaps,
    });
  } catch (error) {
    console.error("Citation monitor error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
