import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { calculateAgentReadinessFromUrl } from "@/lib/agent-readiness";
import { withApiProtection } from "@/lib/api-protection";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function handlePost(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    const score = await calculateAgentReadinessFromUrl(url);

    return NextResponse.json({ success: true, score });
  } catch (error) {
    console.error("Agent readiness error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const POST = withApiProtection(handlePost, { critical: true });
