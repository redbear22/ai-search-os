import { NextRequest, NextResponse } from "next/server";
import { calculateEntityTrust } from "@/lib/entity-trust";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { brandName, domain } = await request.json();

    if (!brandName?.trim()) {
      return NextResponse.json({ error: "Brand name required" }, { status: 400 });
    }

    if (!domain?.trim()) {
      return NextResponse.json({ error: "Domain required" }, { status: 400 });
    }

    const score = await calculateEntityTrust(brandName.trim(), domain.trim());

    return NextResponse.json({ success: true, score });
  } catch (error) {
    console.error("Entity trust error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
