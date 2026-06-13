import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import type { AgencyRole } from "@prisma/client";
import { INVITABLE_ROLES } from "@/lib/agency-rbac";
import { prisma } from "@/lib/prisma";
import { isAdminUnlimitedAccess } from "@/lib/resolve-effective-tier";
import { requireAgencyAccess } from "@/lib/workspace";

const memberSelect = {
  id: true,
  email: true,
  name: true,
  agencyRole: true,
  clientId: true,
  createdAt: true,
  assignments: {
    select: {
      client: { select: { id: true, name: true, domain: true } },
    },
  },
} as const;

export async function GET() {
  const access = await requireAgencyAccess({ permission: "manage_team" });
  if (access instanceof NextResponse) return access;

  const [members, subscription, pendingInvites] = await Promise.all([
    prisma.user.findMany({
      where: { agencyId: access.agencyId },
      select: memberSelect,
      orderBy: { createdAt: "asc" },
    }),
    prisma.subscription.findUnique({
      where: { agencyId: access.agencyId },
      select: { teamMemberLimit: true },
    }),
    prisma.agencyInvite.findMany({
      where: { agencyId: access.agencyId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        email: true,
        agencyRole: true,
        clientId: true,
        clientIds: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const clients = await prisma.client.findMany({
    where: { agencyId: access.agencyId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    members: members.map((member) => ({
      id: member.id,
      email: member.email,
      name: member.name,
      agencyRole: member.agencyRole,
      clientId: member.clientId,
      createdAt: member.createdAt.toISOString(),
      assignedClients: member.assignments.map((a) => a.client),
    })),
    pendingInvites,
    clients,
    limits: {
      teamMemberLimit: subscription?.teamMemberLimit ?? 1,
      currentCount: members.length,
    },
  });
}

export async function POST(request: Request) {
  const access = await requireAgencyAccess({ permission: "manage_team" });
  if (access instanceof NextResponse) return access;

  let body: {
    email?: string;
    agencyRole?: AgencyRole;
    clientIds?: string[];
    clientId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const agencyRole = body.agencyRole ?? "AGENCY_TEAM";
  if (!INVITABLE_ROLES.includes(agencyRole)) {
    return NextResponse.json({ error: "Invalid role for invite" }, { status: 400 });
  }

  if (agencyRole === "CLIENT_VIEWER" && !body.clientId) {
    return NextResponse.json(
      { error: "clientId is required for client viewer role" },
      { status: 400 }
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: { agencyId: access.agencyId },
    select: { teamMemberLimit: true },
  });

  const memberCount = await prisma.user.count({
    where: { agencyId: access.agencyId },
  });

  const limit = subscription?.teamMemberLimit ?? 1;
  if (!isAdminUnlimitedAccess(access.role) && memberCount >= limit) {
    return NextResponse.json(
      { error: `Team member limit reached (${limit})` },
      { status: 403 }
    );
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

  if (body.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: body.clientId, agencyId: access.agencyId },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
  }

  const existingMember = await prisma.user.findFirst({
    where: { email, agencyId: access.agencyId },
    select: { id: true },
  });
  if (existingMember) {
    return NextResponse.json({ error: "User is already on this team" }, { status: 409 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const invite = await prisma.agencyInvite.upsert({
      where: { agencyId_email: { agencyId: access.agencyId, email } },
      create: {
        email,
        agencyId: access.agencyId,
        agencyRole,
        clientId: body.clientId ?? null,
        clientIds: clientIds.length > 0 ? JSON.stringify(clientIds) : null,
        invitedBy: access.userId,
        token,
        expiresAt,
      },
      update: {
        agencyRole,
        clientId: body.clientId ?? null,
        clientIds: clientIds.length > 0 ? JSON.stringify(clientIds) : null,
        invitedBy: access.userId,
        token,
        expiresAt,
        acceptedAt: null,
      },
    });

    return NextResponse.json(
      {
        status: "pending",
        invite: {
          id: invite.id,
          email: invite.email,
          agencyRole: invite.agencyRole,
          expiresAt: invite.expiresAt.toISOString(),
        },
        message:
          "User must be approved in AI Search OS before they can join. Invite saved for when they sign up.",
      },
      { status: 202 }
    );
  }

  if (user.role !== "APPROVED" && user.role !== "ADMIN") {
    return NextResponse.json(
      {
        error:
          "User exists but is not approved yet. Approve them in Admin → Users first.",
      },
      { status: 403 }
    );
  }

  if (user.agencyId && user.agencyId !== access.agencyId) {
    return NextResponse.json(
      { error: "User already belongs to another agency" },
      { status: 409 }
    );
  }

  const member = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: {
        agencyId: access.agencyId,
        agencyRole,
        clientId: agencyRole === "CLIENT_VIEWER" ? body.clientId : null,
      },
      select: memberSelect,
    });

    if (agencyRole === "AGENCY_TEAM" && clientIds.length > 0) {
      for (const clientId of clientIds) {
        await tx.agencyMemberAssignment.upsert({
          where: { userId_clientId: { userId: user.id, clientId } },
          create: { userId: user.id, clientId },
          update: {},
        });
      }
    }

    await tx.agencyInvite.updateMany({
      where: { agencyId: access.agencyId, email },
      data: { acceptedAt: new Date() },
    });

    return updated;
  });

  return NextResponse.json({
    status: "added",
    member: {
      id: member.id,
      email: member.email,
      name: member.name,
      agencyRole: member.agencyRole,
      assignedClients: member.assignments.map((a) => a.client),
    },
  });
}
