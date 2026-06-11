import { NextResponse } from "next/server";
import { startFixPipeline } from "@/lib/automated-fix-pipeline";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({ clientId });
  if (access instanceof NextResponse) return access;

  const runs = await prisma.fixPipelineRun.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    runs: runs.map((run) => ({
      id: run.id,
      clientId: run.clientId,
      gapId: run.gapId,
      pipelineType: run.pipelineType,
      status: run.status,
      currentStep: run.currentStep,
      steps: run.steps,
      requiresApproval: run.requiresApproval,
      approvedAt: run.approvedAt?.toISOString() ?? null,
      createdAt: run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({
    clientId,
    permission: "generate_fixes",
  });
  if (access instanceof NextResponse) return access;

  let body: { gapId?: string; gap?: Record<string, unknown>; autoSend?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let gap = body.gap;

  if (body.gapId) {
    const dbGap = await prisma.gap.findFirst({
      where: { id: body.gapId, clientId },
    });
    if (!dbGap) {
      return NextResponse.json({ error: "Gap not found" }, { status: 404 });
    }
    gap = {
      id: dbGap.id,
      layer: dbGap.layer,
      severity: dbGap.severity,
      title: dbGap.title,
      description: dbGap.description,
      source: dbGap.layer,
      suggestedAction: dbGap.description,
      suggestedOwner: dbGap.suggestedOwner ?? "SEO",
    };
  }

  if (!gap?.title || !gap?.layer) {
    return NextResponse.json({ error: "gap or gapId required" }, { status: 400 });
  }

  try {
    const result = await startFixPipeline({
      clientId,
      gap: gap as Parameters<typeof startFixPipeline>[0]["gap"],
      autoSend: body.autoSend === true,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline failed" },
      { status: 500 }
    );
  }
}
