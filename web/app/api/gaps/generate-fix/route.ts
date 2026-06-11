import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withApiProtection } from "@/lib/api-protection";
import { fixInputFromGap, generateFix } from "@/lib/server/fix-generation";
import type { Gap } from "@/types/gap";

export const dynamic = "force-dynamic";

function isGap(value: unknown): value is Gap {
  if (!value || typeof value !== "object") return false;
  const g = value as Record<string, unknown>;
  return (
    typeof g.id === "string" &&
    typeof g.layer === "string" &&
    typeof g.title === "string" &&
    typeof g.description === "string"
  );
}

/** @deprecated Prefer POST /api/fixes/generate with description + context */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const gap = body?.gap;

    if (!isGap(gap)) {
      return NextResponse.json({ error: "Valid gap object is required" }, { status: 400 });
    }

    const fix = await generateFix(fixInputFromGap(gap));
    return NextResponse.json({ success: true, fix });
  } catch (error) {
    console.error("Gap fix generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const POST = withApiProtection(handlePost, { critical: true });
