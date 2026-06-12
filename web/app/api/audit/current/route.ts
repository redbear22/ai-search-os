import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkflowContext } from "@/lib/workflow-access";
import { auditRowToEnvelope } from "@/lib/workflow-mappers";
import { workflowErrorResponse } from "@/lib/workflow-route";

export async function GET() {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const audit = await prisma.audit.findFirst({
      where: { clientId: ctx.clientId },
      orderBy: { updatedAt: "desc" },
    });

    if (!audit) {
      return NextResponse.json({ audit: null });
    }

    return NextResponse.json({ audit: auditRowToEnvelope(audit) });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
