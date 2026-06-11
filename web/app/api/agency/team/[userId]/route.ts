import { NextResponse } from "next/server";
import type { AgencyRole } from "@prisma/client";
import { INVITABLE_ROLES } from "@/lib/agency-rbac";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";

type RouteContext = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { userId } = await context.params;
  const access = await requireAgencyAccess({ permission: "manage_team" });
  if (access instanceof NextResponse) return access;

  let body: {
    agencyRole?: AgencyRole;
    clientIds?: string[];
    clientId?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const member = await prisma.user.findFirst({
    where: { id: userId, agencyId: access.agencyId },
    select: { id: true, agencyRole: true },
  });

  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  if (member.agencyRole === "AGENCY_OWNER" && access.userId !== member.id) {
    const ownerCount = await prisma.user.count({
      where: { agencyId: access.agencyId, agencyRole: "AGENCY_OWNER" },
    });
    if (body.agencyRole && body.agencyRole !== "AGENCY_OWNER" && ownerCount <= 1) {
      return NextResponse.json(
        { error: "Agency must have at least one owner" },
        { status: 400 }
      );
    }
  }

  if (body.agencyRole && !INVITABLE_ROLES.includes(body.agencyRole) && body.agencyRole !== "AGENCY_OWNER") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (access.agencyRole !== "AGENCY_OWNER" && member.agencyRole === "AGENCY_OWNER") {
    return NextResponse.json({ error: "Only owners can modify owner accounts" }, { status: 403 });
  }

  const clientIds = body.clientIds ?? [];
  if (clientIds.length > 0) {
    const validCount = await prisma.client.count({
      where: { agencyId: access.agencyId, id: { in: clientIds } },
    });
    if (validCount !== clientIds.length) {
      return NextResponse.json({ error: "Invalid client assignment" }, { status: 400 });
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        ...(body.agencyRole ? { agencyRole: body.agencyRole } : {}),
        ...(body.clientId !== undefined ? { clientId: body.clientId } : {}),
        ...(body.agencyRole === "CLIENT_VIEWER" && body.clientId
          ? { clientId: body.clientId }
          : {}),
        ...(body.agencyRole && body.agencyRole !== "CLIENT_VIEWER"
          ? { clientId: null }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        agencyRole: true,
        clientId: true,
      },
    });

    if (body.clientIds !== undefined) {
      await tx.agencyMemberAssignment.deleteMany({ where: { userId } });
      if (body.clientIds.length > 0) {
        await tx.agencyMemberAssignment.createMany({
          data: body.clientIds.map((clientId) => ({ userId, clientId })),
        });
      }
    }

    return user;
  });

  const assignments = await prisma.agencyMemberAssignment.findMany({
    where: { userId },
    select: { client: { select: { id: true, name: true, domain: true } } },
  });

  return NextResponse.json({
    member: {
      ...updated,
      assignedClients: assignments.map((a) => a.client),
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { userId } = await context.params;
  const access = await requireAgencyAccess({ permission: "manage_team" });
  if (access instanceof NextResponse) return access;

  if (userId === access.userId) {
    return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
  }

  const member = await prisma.user.findFirst({
    where: { id: userId, agencyId: access.agencyId },
    select: { id: true, agencyRole: true },
  });

  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  if (member.agencyRole === "AGENCY_OWNER") {
    const ownerCount = await prisma.user.count({
      where: { agencyId: access.agencyId, agencyRole: "AGENCY_OWNER" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the only agency owner" },
        { status: 400 }
      );
    }
  }

  if (access.agencyRole !== "AGENCY_OWNER" && member.agencyRole === "AGENCY_OWNER") {
    return NextResponse.json({ error: "Only owners can remove owner accounts" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.agencyMemberAssignment.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        agencyId: null,
        agencyRole: "AGENCY_TEAM",
        clientId: null,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
