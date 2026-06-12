import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { GapFix } from "@/types";
import { prisma } from "@/lib/prisma";
import { requireWorkflowContext } from "@/lib/workflow-access";
import { dbGapToUiGap } from "@/lib/workflow-mappers";
import { workflowErrorResponse } from "@/lib/workflow-route";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;
  let body: {
    status?: string;
    fixGenerated?: GapFix | null;
    title?: string;
    severity?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const existing = await prisma.gap.findFirst({
    where: { id, clientId: ctx.clientId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Gap not found" }, { status: 404 });
  }

  const data: Prisma.GapUpdateInput = {
    status: body.status ?? existing.status,
    title: body.title ?? existing.title,
    severity: body.severity ?? existing.severity,
  };

  if (body.fixGenerated !== undefined) {
    data.fixGenerated =
      body.fixGenerated === null
        ? Prisma.JsonNull
        : (JSON.parse(JSON.stringify(body.fixGenerated)) as Prisma.InputJsonValue);
  }

  const updated = await prisma.gap.update({
    where: { id },
    data,
  });

  return NextResponse.json({ gap: dbGapToUiGap(updated) });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;
  try {
    const existing = await prisma.gap.findFirst({
    where: { id, clientId: ctx.clientId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Gap not found" }, { status: 404 });
  }

  await prisma.gap.update({
    where: { id },
    data: { status: "deleted" },
  });

  return NextResponse.json({ ok: true });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
