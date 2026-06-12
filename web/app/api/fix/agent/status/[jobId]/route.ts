import { NextResponse } from "next/server";
import { getAgentFixStatus, isAgentFixConfigured } from "@/lib/agent-fix-server";
import { requireWorkflowContext } from "@/lib/workflow-access";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!isAgentFixConfigured()) {
    return NextResponse.json(
      { error: "Agent fix not configured on server" },
      { status: 503 }
    );
  }

  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  const { jobId } = await context.params;
  if (!jobId?.trim()) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  try {
    const status = await getAgentFixStatus(jobId.trim());
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
