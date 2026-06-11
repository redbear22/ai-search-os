import { NextRequest, NextResponse } from "next/server";
import type { OutreachTask } from "@/lib/citation-engine-client";
import { createOutreachTaskServer } from "@/lib/citation-engine-push-server";

export async function POST(request: NextRequest) {
  try {
    const task = (await request.json()) as OutreachTask;

    if (!task?.publication || !task?.pitch || !task?.dueDate) {
      return NextResponse.json(
        { error: "Invalid outreach task: publication, pitch, and dueDate are required" },
        { status: 400 }
      );
    }

    const result = await createOutreachTaskServer(task);
    return NextResponse.json({ success: true, ...((result as object) ?? {}) });
  } catch (error) {
    console.error("Outreach task creation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create outreach task",
      },
      { status: 503 }
    );
  }
}
