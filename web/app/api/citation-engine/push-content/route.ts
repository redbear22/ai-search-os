import { NextRequest, NextResponse } from "next/server";
import type { ContentPayload } from "@/lib/citation-engine-client";
import { pushContentServer } from "@/lib/citation-engine-push-server";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as ContentPayload;

    if (!payload?.title || !payload?.body || !payload?.type) {
      return NextResponse.json(
        { error: "Invalid content payload: type, title, and body are required" },
        { status: 400 }
      );
    }

    const result = await pushContentServer(payload);
    return NextResponse.json({ success: true, ...((result as object) ?? {}) });
  } catch (error) {
    console.error("Citation content push failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to push content",
      },
      { status: 503 }
    );
  }
}
