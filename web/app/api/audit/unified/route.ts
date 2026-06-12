import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-protection";
import { runUnifiedAudit } from "@/lib/unified-data-client";

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const brandName = body.brandName ?? "PickAdviser";
    const domain = body.domain ?? "pickadviser.org";
    const competitors = Array.isArray(body.competitors)
      ? body.competitors
      : ["competitor1.com", "competitor2.com"];

    const results = await runUnifiedAudit(brandName, domain, competitors);
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const POST = withApiAuth(handlePost);
