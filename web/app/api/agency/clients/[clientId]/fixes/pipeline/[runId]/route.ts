import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";

type RouteContext = { params: Promise<{ clientId: string; runId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { clientId, runId } = await context.params;
  const access = await requireAgencyAccess({ clientId });
  if (access instanceof NextResponse) return access;

  const run = await prisma.fixPipelineRun.findFirst({
    where: { id: runId, clientId },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: run.id,
    clientId: run.clientId,
    gapId: run.gapId,
    pipelineType: run.pipelineType,
    status: run.status,
    currentStep: run.currentStep,
    steps: run.steps,
    gapSnapshot: run.gapSnapshot,
    requiresApproval: run.requiresApproval,
    approvedAt: run.approvedAt?.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
  });
}
