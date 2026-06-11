import { NextRequest, NextResponse } from "next/server";
import { runUnifiedAudit } from "@/lib/unified-data-client";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

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
