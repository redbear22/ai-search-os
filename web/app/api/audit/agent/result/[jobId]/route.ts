import { NextResponse } from "next/server";
import { getAgentAuditResult, isAgentAuditConfigured } from "@/lib/agent-audit-server";
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
    const result = await getAgentAuditResult(jobId.trim());
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Result fetch failed";
    const status = message.includes("not finished") ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
