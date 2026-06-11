import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { runWeeklyCitationAudit } from "@/lib/citation-intelligence";
import { withApiProtection } from "@/lib/api-protection";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function handlePost(request: NextRequest) {
  try {
    const { queries, brandName, competitors, domain, originSignalsDeployed } =
      await request.json();

    if (!queries?.length || !brandName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const results = await runWeeklyCitationAudit(
      queries,
      brandName,
      competitors || [],
      { domain, originSignalsDeployed }
    );

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Citation intelligence error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const POST = withApiProtection(handlePost, { critical: true });
