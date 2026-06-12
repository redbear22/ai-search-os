import { NextResponse } from "next/server";
import type { Action } from "@/store/actionStore";
import { prisma } from "@/lib/prisma";
import { requireWorkflowContext } from "@/lib/workflow-access";
import { actionPlanToAction, actionToActionPlanFields } from "@/lib/workflow-mappers";

export async function GET() {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  const rows = await prisma.actionPlan.findMany({
    where: { clientId: ctx.clientId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    actions: rows.map(actionPlanToAction),
  });
}

export async function POST(request: Request) {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = (await request.json()) as { actions?: Action[]; action?: Action };
  const actions = body.actions ?? (body.action ? [body.action] : []);

  if (actions.length === 0) {
    return NextResponse.json({ error: "action or actions required" }, { status: 400 });
  }

  const maxSort = await prisma.actionPlan.aggregate({
    where: { clientId: ctx.clientId },
    _max: { sortOrder: true },
  });
  let sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  const created = await prisma.$transaction(
    actions.map((action) => {
      const data = actionToActionPlanFields(action, ctx.clientId, sortOrder);
      sortOrder += 1;
      return prisma.actionPlan.create({ data });
    })
  );

  return NextResponse.json(
    { actions: created.map(actionPlanToAction) },
    { status: 201 }
  );
}

export async function PUT(request: Request) {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = (await request.json()) as { actions: Action[] };
  if (!Array.isArray(body.actions)) {
    return NextResponse.json({ error: "actions array required" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.actionPlan.deleteMany({ where: { clientId: ctx.clientId } });
    let sortOrder = 0;
    for (const action of body.actions) {
      await tx.actionPlan.create({
        data: actionToActionPlanFields(action, ctx.clientId, sortOrder),
      });
      sortOrder += 1;
    }
  });

  const rows = await prisma.actionPlan.findMany({
    where: { clientId: ctx.clientId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ actions: rows.map(actionPlanToAction) });
}
