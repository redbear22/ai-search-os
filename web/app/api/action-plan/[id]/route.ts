import { NextResponse } from "next/server";
import type { Action } from "@/store/actionStore";
import { prisma } from "@/lib/prisma";
import { requireWorkflowContext } from "@/lib/workflow-access";
import { actionPlanToAction, actionToActionPlanFields } from "@/lib/workflow-mappers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;
  const body = (await request.json()) as Partial<Action>;

  const existing = await prisma.actionPlan.findFirst({
    where: { id, clientId: ctx.clientId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  const merged: Action = {
    ...actionPlanToAction(existing),
    ...body,
    id,
  };

  const updated = await prisma.actionPlan.update({
    where: { id },
    data: actionToActionPlanFields(merged, ctx.clientId, existing.sortOrder),
  });

  return NextResponse.json({ action: actionPlanToAction(updated) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;
  const existing = await prisma.actionPlan.findFirst({
    where: { id, clientId: ctx.clientId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  await prisma.actionPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
