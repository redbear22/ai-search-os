import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAgencyPermission } from "@/lib/agency-rbac";
import { requireAgencyAccess, slugify } from "@/lib/workspace";

const agencySelect = {
  id: true,
  name: true,
  slug: true,
  logo: true,
  primaryColor: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  subscription: {
    select: {
      plan: true,
      status: true,
      clientLimit: true,
      teamMemberLimit: true,
    },
  },
} as const;

export async function GET() {
  const access = await requireAgencyAccess();
  if (access instanceof NextResponse) return access;

  const agency = await prisma.agency.findUnique({
    where: { id: access.agencyId },
    select: agencySelect,
  });

  if (!agency) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  }

  if (!hasAgencyPermission(access.agencyRole, "billing")) {
    return NextResponse.json({ ...agency, subscription: null });
  }

  return NextResponse.json(agency);
}

export async function PATCH(request: Request) {
  const access = await requireAgencyAccess({ permission: "manage_clients" });
  if (access instanceof NextResponse) return access;

  let body: {
    name?: string;
    slug?: string;
    logo?: string | null;
    primaryColor?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const slug = body.slug?.trim() ? slugify(body.slug) : undefined;
  const logo =
    body.logo === undefined
      ? undefined
      : body.logo === null
        ? null
        : body.logo.trim() || null;
  const primaryColor = body.primaryColor?.trim();

  if (slug) {
    const conflict = await prisma.agency.findFirst({
      where: { slug, NOT: { id: access.agencyId } },
      select: { id: true },
    });
    if (conflict) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }
  }

  const agency = await prisma.agency.update({
    where: { id: access.agencyId },
    data: {
      ...(name ? { name } : {}),
      ...(slug ? { slug } : {}),
      ...(logo !== undefined ? { logo } : {}),
      ...(primaryColor ? { primaryColor } : {}),
    },
    select: agencySelect,
  });

  return NextResponse.json(agency);
}
