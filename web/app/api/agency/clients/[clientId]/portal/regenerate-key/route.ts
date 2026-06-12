import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildClientPortalUrl,
  ensureClientPortalSettings,
} from "@/lib/client-portal";
import { generateClientAccessKey, requireAgencyAccess, requireAgencyFeature } from "@/lib/workspace";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({
    clientId,
    permission: "manage_clients",
  });
  if (access instanceof NextResponse) return access;

  const featureBlock = await requireAgencyFeature(access.agencyId, "clientPortals");
  if (featureBlock) return featureBlock;

  const existing = await prisma.client.findFirst({
    where: { id: clientId, agencyId: access.agencyId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  await ensureClientPortalSettings(clientId);

  const accessKey = generateClientAccessKey();
  await prisma.clientSettings.update({
    where: { clientId },
    data: { clientAccessKey: accessKey },
  });

  return NextResponse.json({
    accessKey,
    portalUrl: buildClientPortalUrl(accessKey),
  });
}
