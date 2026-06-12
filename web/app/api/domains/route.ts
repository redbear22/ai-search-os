import { NextResponse } from "next/server";
import { checkDomainLimit, normalizeDomainForStorage } from "@/lib/domain-limits";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";

const domainSelect = {
  id: true,
  url: true,
  clientId: true,
  isActive: true,
  treatAsSeparate: true,
  separationReason: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET() {
  const access = await requireAgencyAccess();
  if (access instanceof NextResponse) return access;

  const domains = await prisma.domain.findMany({
    where: { agencyId: access.agencyId, isActive: true },
    select: domainSelect,
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(domains);
}

export async function POST(request: Request) {
  const access = await requireAgencyAccess({ permission: "manage_clients" });
  if (access instanceof NextResponse) return access;

  let body: {
    url?: string;
    clientId?: string | null;
    treatAsSeparate?: boolean;
    separationReason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const clientId = body.clientId?.trim() || null;
  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, agencyId: access.agencyId },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json(
        { error: "clientId must belong to this agency workspace" },
        { status: 400 }
      );
    }
  }

  const treatAsSeparate = body.treatAsSeparate ?? false;
  const normalized = normalizeDomainForStorage(url, treatAsSeparate);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid domain URL" }, { status: 400 });
  }

  const limitCheck = await checkDomainLimit(access.userId, normalized, {
    treatAsSeparate,
  });

  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: limitCheck.message ?? "Domain limit reached" },
      { status: 403 }
    );
  }

  const existing = await prisma.domain.findUnique({
    where: {
      agencyId_url: { agencyId: access.agencyId, url: normalized },
    },
    select: domainSelect,
  });
  if (existing?.isActive) {
    return NextResponse.json(
      { error: "Domain already registered for this workspace" },
      { status: 409 }
    );
  }

  const domain = await prisma.domain.create({
    data: {
      agencyId: access.agencyId,
      userId: access.userId,
      clientId,
      url: normalized,
      treatAsSeparate,
      separationReason: body.separationReason?.trim() || null,
    },
    select: domainSelect,
  });

  return NextResponse.json(domain, { status: 201 });
}
