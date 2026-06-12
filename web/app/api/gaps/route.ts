import { NextResponse } from "next/server";
import type { Gap } from "@/types/gap";
import { prisma } from "@/lib/prisma";
import { requireWorkflowContext } from "@/lib/workflow-access";
import { dbGapToUiGap, uiGapToDbFields } from "@/lib/workflow-mappers";
import { workflowErrorResponse } from "@/lib/workflow-route";

export async function GET(request: Request) {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(request.url);
    const auditId = searchParams.get("auditId")?.trim();

    const gaps = await prisma.gap.findMany({
      where: {
        clientId: ctx.clientId,
        status: { not: "deleted" },
        ...(auditId ? { auditId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      gaps: gaps.map(dbGapToUiGap),
      count: gaps.length,
    });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

type PostGapsBody = {
  auditId?: string;
  gaps: Gap[];
  replace?: boolean;
};

export async function POST(request: Request) {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  let body: PostGapsBody;
  try {
    body = (await request.json()) as PostGapsBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.gaps)) {
    return NextResponse.json({ error: "gaps array is required" }, { status: 400 });
  }

  const auditId = body.auditId?.trim() || null;

  try {
    if (auditId) {
      const audit = await prisma.audit.findFirst({
        where: { id: auditId, clientId: ctx.clientId },
        select: { id: true },
      });
      if (!audit) {
        return NextResponse.json({ error: "Audit not found" }, { status: 404 });
      }
    }

    if (body.replace && auditId) {
      await prisma.gap.updateMany({
        where: { clientId: ctx.clientId, auditId, status: { not: "resolved" } },
        data: { status: "deleted" },
      });
    }

    if (body.gaps.length === 0) {
      return NextResponse.json({ gaps: [], count: 0 });
    }

    const created = await prisma.$transaction(
      body.gaps.map((gap) =>
        prisma.gap.create({
          data: {
            clientId: ctx.clientId,
            ...uiGapToDbFields(gap, auditId ?? undefined),
          },
        })
      )
    );

    if (auditId) {
      await prisma.audit.updateMany({
        where: { id: auditId, clientId: ctx.clientId },
        data: { gapCount: created.length },
      });
    }

    return NextResponse.json(
      {
        gaps: created.map(dbGapToUiGap),
        count: created.length,
      },
      { status: 201 }
    );
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
