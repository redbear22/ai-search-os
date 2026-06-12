import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildClientPortalUrl,
  ensureClientPortalSettings,
} from "@/lib/client-portal";
import { generateClientAccessKey, requireAgencyAccess, requireAgencyFeature } from "@/lib/workspace";

type RouteContext = { params: Promise<{ clientId: string }> };

async function loadClientPortal(clientId: string, agencyId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId },
    include: {
      agency: { include: { branding: true } },
      settings: true,
    },
  });

  if (!client) return null;

  const settings = await ensureClientPortalSettings(clientId);
  const accessKey = settings.clientAccessKey ?? generateClientAccessKey();

  return {
    id: settings.id,
    clientId: client.id,
    enabled: settings.shareWithClient,
    accessKey,
    portalUrl: buildClientPortalUrl(accessKey),
    branding: {
      logoUrl: settings.agencyLogo ?? client.agency.logo ?? undefined,
      primaryColor: settings.brandColor ?? client.agency.primaryColor ?? undefined,
      customDomain: client.agency.branding?.customDomain ?? undefined,
    },
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({ clientId });
  if (access instanceof NextResponse) return access;

  const featureBlock = await requireAgencyFeature(access.agencyId, "clientPortals");
  if (featureBlock) return featureBlock;

  const portal = await loadClientPortal(clientId, access.agencyId);
  if (!portal) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json(portal);
}

export async function PUT(request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({
    clientId,
    permission: "manage_clients",
  });
  if (access instanceof NextResponse) return access;

  const featureBlock = await requireAgencyFeature(access.agencyId, "clientPortals");
  if (featureBlock) return featureBlock;

  let body: { enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  const existing = await prisma.client.findFirst({
    where: { id: clientId, agencyId: access.agencyId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  await ensureClientPortalSettings(clientId);

  await prisma.clientSettings.update({
    where: { clientId },
    data: { shareWithClient: body.enabled },
  });

  const portal = await loadClientPortal(clientId, access.agencyId);
  return NextResponse.json(portal);
}
