import { NextResponse } from "next/server";
import {
  runAutonomousAudit,
} from "@/lib/autonomous-audit-engine";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";
import type { AuditTriggerType } from "@/types/autonomous-audit";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({ clientId, permission: "run_audits" });
  if (access instanceof NextResponse) return access;

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: access.agencyId },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  let triggerType: AuditTriggerType = "webhook";
  try {
    const body = (await request.json()) as { triggerType?: AuditTriggerType };
    if (body.triggerType) triggerType = body.triggerType;
  } catch {
    // default webhook/manual trigger
  }

  try {
    const result = await runAutonomousAudit(clientId, triggerType);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Audit run failed" },
      { status: 500 }
    );
  }
}
