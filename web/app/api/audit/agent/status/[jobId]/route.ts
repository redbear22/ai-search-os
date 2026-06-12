import { NextResponse } from "next/server";
import { getAgentAuditStatus, isAgentAuditConfigured } from "@/lib/agent-audit-server";
import { requireWorkflowContext } from "@/lib/workflow-access";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!isAgentAuditConfigured()) {
    return NextResponse.json(
      { error: "Agent audit not configured on server" },
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
    const status = await getAgentAuditStatus(jobId.trim());
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
