import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { calculateZeroClickVisibility } from "@/lib/zero-click-visibility";
import { withApiProtection } from "@/lib/api-protection";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function handlePost(request: NextRequest) {
  try {
    const { brandName, queries, competitors } = await request.json();

    if (!brandName || !queries?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const metrics = await calculateZeroClickVisibility(
      brandName,
      queries,
      competitors || []
    );

    return NextResponse.json({ success: true, metrics });
  } catch (error) {
    console.error("Zero-click visibility error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const POST = withApiProtection(handlePost, { critical: true });
