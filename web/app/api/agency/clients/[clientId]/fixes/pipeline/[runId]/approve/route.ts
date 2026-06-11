import { NextResponse } from "next/server";
import { approveFixPipeline } from "@/lib/automated-fix-pipeline";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";

type RouteContext = { params: Promise<{ clientId: string; runId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { clientId, runId } = await context.params;
  const access = await requireAgencyAccess({
    clientId,
    permission: "manage_clients",
  });
  if (access instanceof NextResponse) return access;

  const run = await prisma.fixPipelineRun.findFirst({
    where: { id: runId, clientId },
    select: { id: true },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  try {
    await approveFixPipeline(runId, access.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Approval failed" },
      { status: 500 }
    );
  }
}
