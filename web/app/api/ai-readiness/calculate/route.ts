import { NextRequest, NextResponse } from "next/server";
import { calculateAIReadiness } from "@/lib/ai-readiness";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    const score = await calculateAIReadiness(url);

    return NextResponse.json({ success: true, score });
  } catch (error) {
    console.error("AI Readiness calculation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
