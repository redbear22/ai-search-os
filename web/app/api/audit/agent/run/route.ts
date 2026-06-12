import { NextResponse } from "next/server";
import {
  isAgentAuditConfigured,
  normalizeSiteUrl,
  runAgentAuditJob,
} from "@/lib/agent-audit-server";
import { requireWorkflowContext } from "@/lib/workflow-access";

type RunBody = {
  domain?: string;
  siteUrl?: string;
};

export async function POST(request: Request) {
  if (!isAgentAuditConfigured()) {
    return NextResponse.json(
      { error: "Agent audit not configured on server" },
      { status: 503 }
    );
  }

  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  let body: RunBody;
  try {
    body = (await request.json()) as RunBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const siteUrl = normalizeSiteUrl(body.siteUrl ?? body.domain ?? "");
  if (!siteUrl || siteUrl === "https://example.com") {
    return NextResponse.json({ error: "domain or siteUrl is required" }, { status: 400 });
  }

  try {
    const job = await runAgentAuditJob({
      siteUrl,
      clientId: ctx.clientId,
      createdBy: ctx.userId,
    });
    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent audit failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
