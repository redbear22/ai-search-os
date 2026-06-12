import { NextResponse } from "next/server";
import type { AuditData } from "@/lib/audit-types";
import { prisma } from "@/lib/prisma";
import { requireWorkflowContext } from "@/lib/workflow-access";
import { auditRowToEnvelope } from "@/lib/workflow-mappers";

type SaveAuditBody = {
  id?: string;
  brandName?: string;
  domain?: string;
  url?: string;
  auditData: AuditData;
  isCompleted?: boolean;
  completedAt?: string | null;
  gapCount?: number;
};

export async function POST(request: Request) {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  let body: SaveAuditBody;
  try {
    body = (await request.json()) as SaveAuditBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.auditData) {
    return NextResponse.json({ error: "auditData is required" }, { status: 400 });
  }

  const domain = (body.domain ?? body.url ?? "").trim() || "unknown";
  const brandName = body.brandName?.trim() || domain;
  const isCompleted = body.isCompleted === true;
  const completedAt =
    body.completedAt != null
      ? new Date(body.completedAt)
      : isCompleted
        ? new Date()
        : null;

  if (body.id) {
    const existing = await prisma.audit.findFirst({
      where: { id: body.id, clientId: ctx.clientId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    const updated = await prisma.audit.update({
      where: { id: body.id },
      data: {
        brandName,
        domain,
        auditData: body.auditData,
        gapCount: body.gapCount ?? existing.gapCount,
        isCompleted,
        completedAt,
        userId: ctx.userId,
      },
    });

    return NextResponse.json({ audit: auditRowToEnvelope(updated) });
  }

  const latest = await prisma.audit.findFirst({
    where: { clientId: ctx.clientId },
    orderBy: { updatedAt: "desc" },
  });

  if (latest && !latest.isCompleted) {
    const updated = await prisma.audit.update({
      where: { id: latest.id },
      data: {
        brandName,
        domain,
        auditData: body.auditData,
        gapCount: body.gapCount ?? latest.gapCount,
        isCompleted,
        completedAt,
        userId: ctx.userId,
      },
    });
    return NextResponse.json({ audit: auditRowToEnvelope(updated) });
  }

  const created = await prisma.audit.create({
    data: {
      clientId: ctx.clientId,
      userId: ctx.userId,
      brandName,
      domain,
      auditData: body.auditData,
      gapCount: body.gapCount ?? 0,
      isCompleted,
      completedAt,
    },
  });

  return NextResponse.json({ audit: auditRowToEnvelope(created) }, { status: 201 });
}
