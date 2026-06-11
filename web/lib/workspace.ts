import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AgencyRole, UserRole } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import {
  hasAgencyPermission,
  requiresClientAssignment,
  type AgencyPermission,
} from "@/lib/agency-rbac";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const ACTIVE_CLIENT_COOKIE = "active-client-id";

const AGENCY_ROLES: AgencyRole[] = [
  "AGENCY_OWNER",
  "AGENCY_ADMIN",
  "AGENCY_TEAM",
  "CLIENT_VIEWER",
];

export type AgencyAccess = {
  userId: string;
  agencyId: string;
  clientId: string | null;
  agencyRole: AgencyRole;
  role: UserRole;
};

export function generateClientAccessKey(): string {
  return randomBytes(24).toString("base64url");
}

export function slugify(value: string): string {
  return slugifyAgencyName(value);
}

export function slugifyAgencyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "agency";
}

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

export async function getActiveClientId(
  request?: NextRequest
): Promise<string | null> {
  // cookies() only works in App Router contexts — not during Pages API OAuth callback.
  try {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value?.trim();
    if (fromCookie) return fromCookie;
  } catch {
    // ignore — fall through to token/session lookup
  }

  if (request) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (typeof token?.activeClientId === "string" && token.activeClientId) {
      return token.activeClientId;
    }
  }

  try {
    const session = await getSession();
    if (session?.user?.activeClientId) return session.user.activeClientId;
    if (session?.user?.clientId) return session.user.clientId;

    if (!session?.user?.id) return null;

    const agencyId = await resolveAgencyId(session.user.id);
    if (!agencyId) return null;

    const firstClient = await prisma.client.findFirst({
      where: { agencyId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    return firstClient?.id ?? null;
  } catch {
    return null;
  }
}

export async function loadWorkspaceUserFields(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      agencyId: true,
      clientId: true,
      agencyRole: true,
      ownedAgencies: { select: { id: true }, take: 1 },
    },
  });

  if (!user) return null;

  const agencyId = user.agencyId ?? user.ownedAgencies[0]?.id ?? null;
  const activeClientId =
    (await getActiveClientId()) ??
    user.clientId ??
    (agencyId
      ? (
          await prisma.client.findFirst({
            where: { agencyId },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          })
        )?.id ?? null
      : null);

  return {
    role: user.role,
    agencyId,
    clientId: user.clientId,
    agencyRole: user.agencyRole,
    activeClientId,
  };
}

type AgencyAccessOptions = {
  clientId?: string;
  /** @deprecated Use permission instead */
  requireWrite?: boolean;
  permission?: AgencyPermission;
};

async function userHasClientAssignment(userId: string, clientId: string): Promise<boolean> {
  const assignment = await prisma.agencyMemberAssignment.findUnique({
    where: { userId_clientId: { userId, clientId } },
    select: { id: true },
  });
  return Boolean(assignment);
}

export async function canAccessClient(
  access: AgencyAccess,
  clientId: string
): Promise<boolean> {
  if (access.agencyRole === "CLIENT_VIEWER") {
    return access.clientId === clientId;
  }

  if (hasAgencyPermission(access.agencyRole, "manage_clients")) {
    return true;
  }

  if (requiresClientAssignment(access.agencyRole)) {
    return userHasClientAssignment(access.userId, clientId);
  }

  return false;
}

export async function requireAgencyAccess(
  options: AgencyAccessOptions = {}
): Promise<AgencyAccess | NextResponse> {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      agencyId: true,
      clientId: true,
      agencyRole: true,
      ownedAgencies: { select: { id: true }, take: 1 },
    },
  });

  const agencyId = user?.agencyId ?? user?.ownedAgencies[0]?.id ?? null;

  if (!user || !agencyId) {
    return NextResponse.json({ error: "No agency workspace" }, { status: 404 });
  }

  if (!AGENCY_ROLES.includes(user.agencyRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const permission =
    options.permission ??
    (options.requireWrite ? ("manage_clients" as AgencyPermission) : undefined);

  if (permission && !hasAgencyPermission(user.agencyRole, permission)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const access: AgencyAccess = {
    userId: user.id,
    agencyId,
    clientId: user.clientId,
    agencyRole: user.agencyRole,
    role: user.role,
  };

  if (user.agencyRole === "CLIENT_VIEWER") {
    if (!user.clientId) {
      return NextResponse.json({ error: "Client access not configured" }, {
        status: 403,
      });
    }
    if (options.clientId && user.clientId !== options.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return access;
  }

  if (options.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: options.clientId, agencyId },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (!(await canAccessClient(access, options.clientId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return access;
}

export async function requireAgencyMember() {
  const access = await requireAgencyAccess();
  if (access instanceof NextResponse) return access;

  const agency = await prisma.agency.findUnique({
    where: { id: access.agencyId },
    include: { subscription: true },
  });

  if (!agency) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  }

  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: access.userId } });

  if (!session || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { session, user, agency };
}

export async function getOrCreateAgencyForUser(userId: string, agencyName: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { agency: true },
  });

  if (existing?.agency) return existing.agency;

  const owned = await prisma.agency.findFirst({ where: { ownerId: userId } });
  if (owned) return owned;

  const baseSlug = slugifyAgencyName(agencyName);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.agency.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return prisma.$transaction(async (tx) => {
    const agency = await tx.agency.create({
      data: {
        name: agencyName,
        slug,
        ownerId: userId,
      },
    });

    await tx.subscription.create({
      data: { agencyId: agency.id },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        agencyId: agency.id,
        agencyRole: "AGENCY_OWNER",
      },
    });

    return agency;
  });
}
