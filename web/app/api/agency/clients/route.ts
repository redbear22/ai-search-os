import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminUnlimitedAccess } from "@/lib/resolve-effective-tier";
import { generateClientAccessKey, requireAgencyAccess } from "@/lib/workspace";

const clientSelect = {
  id: true,
  name: true,
  domain: true,
  agencyId: true,
  createdAt: true,
  updatedAt: true,
  settings: {
    select: {
      reportFrequency: true,
      shareWithClient: true,
    },
  },
} as const;

export async function GET() {
  const access = await requireAgencyAccess();
  if (access instanceof NextResponse) return access;

  let where: { agencyId: string; id?: string | { in: string[] } } = {
    agencyId: access.agencyId,
  };

  if (access.agencyRole === "CLIENT_VIEWER" && access.clientId) {
    where = { id: access.clientId, agencyId: access.agencyId };
  } else if (access.agencyRole === "AGENCY_TEAM") {
    const assignments = await prisma.agencyMemberAssignment.findMany({
      where: { userId: access.userId },
      select: { clientId: true },
    });
    const ids = assignments.map((a) => a.clientId);
    where = {
      agencyId: access.agencyId,
      id: { in: ids.length > 0 ? ids : ["__no_assignments__"] },
    };
  }

  const clients = await prisma.client.findMany({
    where,
    select: clientSelect,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const access = await requireAgencyAccess({ permission: "manage_clients" });
  if (access instanceof NextResponse) return access;

  let body: { name?: string; domain?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { agencyId: access.agencyId },
    select: { clientLimit: true },
  });

  const clientCount = await prisma.client.count({
    where: { agencyId: access.agencyId },
  });

  const limit = subscription?.clientLimit ?? 1;
  if (!isAdminUnlimitedAccess(access.role) && clientCount >= limit) {
    return NextResponse.json(
      { error: `Client limit reached (${limit})` },
      { status: 403 }
    );
  }

  const client = await prisma.client.create({
    data: {
      name,
      domain: body.domain?.trim() || null,
      agencyId: access.agencyId,
      settings: {
        create: {
          clientAccessKey: generateClientAccessKey(),
        },
      },
    },
    select: clientSelect,
  });

  return NextResponse.json(client, { status: 201 });
}
