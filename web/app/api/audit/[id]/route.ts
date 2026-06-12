import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkflowContext } from "@/lib/workflow-access";
import { auditRowToEnvelope } from "@/lib/workflow-mappers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;
  const audit = await prisma.audit.findFirst({
    where: { id, clientId: ctx.clientId },
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  return NextResponse.json({ audit: auditRowToEnvelope(audit) });
}
