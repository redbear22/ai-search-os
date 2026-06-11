import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { AuditData } from "@/lib/audit-types";
import { withApiProtection } from "@/lib/api-protection";
import { detectAndScoreGaps } from "@/lib/server/gap-detection";

export const dynamic = "force-dynamic";

function isAuditData(value: unknown): value is AuditData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.discoverability === "object" &&
    data.discoverability !== null &&
    typeof data.clarity === "object" &&
    data.clarity !== null
  );
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const auditData = body?.auditData;

    if (!isAuditData(auditData)) {
      return NextResponse.json(
        { error: "Valid auditData object is required" },
        { status: 400 }
      );
    }

    const { gaps, severityScoring } = detectAndScoreGaps(auditData);
    return NextResponse.json({
      success: true,
      gaps,
      count: gaps.length,
      severityScoring,
    });
  } catch (error) {
    console.error("Gap detection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const POST = withApiProtection(handlePost, { critical: true });
