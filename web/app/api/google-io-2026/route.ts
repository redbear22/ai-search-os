import { NextRequest, NextResponse } from "next/server";
import { calculateGoogleIOReadiness } from "@/lib/google-io-2026";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { domain, hasGbp } = await request.json();

    if (!domain) {
      return NextResponse.json({ error: "Domain required" }, { status: 400 });
    }

    const readiness = await calculateGoogleIOReadiness(
      domain,
      Boolean(hasGbp)
    );

    return NextResponse.json({ success: true, readiness });
  } catch (error) {
    console.error("Google I/O readiness error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
