import { NextResponse } from "next/server";
import {
  isAgentFixConfigured,
  normalizeSiteUrl,
  runAgentFixJob,
  type AgentFixGapInput,
} from "@/lib/agent-fix-server";
import { requireWorkflowContext } from "@/lib/workflow-access";

type RunBody = {
  domain?: string;
  siteUrl?: string;
  gapId?: string;
  gaps?: AgentFixGapInput[];
};

export async function POST(request: Request) {
  if (!isAgentFixConfigured()) {
    return NextResponse.json(
      { error: "Agent fix not configured on server" },
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

  const gaps = body.gaps?.filter((gap) => gap.layer?.trim() && gap.issue?.trim()) ?? [];
  if (gaps.length === 0) {
    return NextResponse.json({ error: "At least one gap with layer and issue is required" }, { status: 400 });
  }

  try {
    const job = await runAgentFixJob({
      siteUrl,
      clientId: ctx.clientId,
      createdBy: ctx.userId,
      gapId: body.gapId,
      gaps,
    });
    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent fix failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
