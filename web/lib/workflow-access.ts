import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  ACTIVE_CLIENT_COOKIE,
  canAccessClient,
  getOrCreateAgencyForUser,
  type AgencyAccess,
} from "@/lib/workspace";

export type WorkflowContext = {
  userId: string;
  clientId: string;
  agencyId: string;
};

async function resolveAgencyId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      agencyId: true,
      ownedAgencies: { select: { id: true }, take: 1 },
    },
  });
  return user?.agencyId ?? user?.ownedAgencies[0]?.id ?? null;
}

/** Ensures the signed-in user has an agency + at least one client for workflow persistence. */
export async function ensureWorkflowClient(
  userId: string,
  displayName?: string | null
): Promise<string> {
  let agencyId = await resolveAgencyId(userId);
  if (!agencyId) {
    const agency = await getOrCreateAgencyForUser(
      userId,
      displayName?.trim() || "My Workspace"
    );
    agencyId = agency.id;
  }

  const existing = await prisma.client.findFirst({
    where: { agencyId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const client = await prisma.client.create({
    data: {
      agencyId,
      name: "Default Brand",
      domain: null,
    },
    select: { id: true },
  });
  return client.id;
}

async function resolveClientId(userId: string, displayName?: string | null): Promise<string> {
  try {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value?.trim();
    if (fromCookie) {
      const agencyId = await resolveAgencyId(userId);
      if (agencyId) {
        const client = await prisma.client.findFirst({
          where: { id: fromCookie, agencyId },
          select: { id: true },
        });
        if (client) return client.id;
      }
    }
  } catch {
    // cookies() unavailable in some contexts
  }

  const session = await getSession();
  if (session?.user?.activeClientId) {
    return session.user.activeClientId;
  }

  const first = await prisma.client.findFirst({
    where: {
      agency: {
        OR: [{ ownerId: userId }, { users: { some: { id: userId } } }],
      },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (first) return first.id;

  return ensureWorkflowClient(userId, displayName);
}

/** Requires APPROVED or ADMIN user with a resolvable client workspace. */
export async function requireWorkflowContext(): Promise<WorkflowContext | NextResponse> {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "PENDING") {
    return NextResponse.json({ error: "Account pending approval" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      role: true,
      agencyId: true,
      agencyRole: true,
      clientId: true,
      ownedAgencies: { select: { id: true }, take: 1 },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencyId = user.agencyId ?? user.ownedAgencies[0]?.id ?? null;
  if (!agencyId) {
    await getOrCreateAgencyForUser(user.id, user.name ?? "My Workspace");
  }

  const resolvedAgencyId =
    agencyId ??
    (await resolveAgencyId(user.id)) ??
    (await getOrCreateAgencyForUser(user.id, user.name ?? "My Workspace")).id;

  const clientId = await resolveClientId(user.id, user.name);

  const access: AgencyAccess = {
    userId: user.id,
    agencyId: resolvedAgencyId,
    clientId: user.clientId,
    agencyRole: user.agencyRole,
    role: user.role,
  };

  if (!(await canAccessClient(access, clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    userId: user.id,
    clientId,
    agencyId: resolvedAgencyId,
  };
}
