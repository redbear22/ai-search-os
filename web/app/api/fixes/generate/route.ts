import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withApiProtection } from "@/lib/api-protection";
import { generateFix } from "@/lib/server/fix-generation";

export const dynamic = "force-dynamic";

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    if (body && typeof body === "object" && "prompt" in body) {
      return NextResponse.json(
        { error: "Raw prompts are not accepted. Send { gap: string }." },
        { status: 400 }
      );
    }

    const gap = typeof body?.gap === "string" ? body.gap.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";

    if (!gap && !description) {
      return NextResponse.json({ error: "gap is required" }, { status: 400 });
    }

    const fix = await generateFix({
      gap: gap || description,
      context:
        body?.context && typeof body.context === "object" ? body.context : undefined,
    });

    return NextResponse.json({ success: true, fix });
  } catch (error) {
    console.error("Fix generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const POST = withApiProtection(handlePost, { critical: true });
