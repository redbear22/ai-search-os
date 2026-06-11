import { NextResponse } from "next/server";
import {
  buildCompetitiveIntelligenceNetwork,
  buildPortalNetworkInsights,
  inferIndustry,
} from "@/lib/competitive-intelligence-network";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ accessKey: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { accessKey } = await context.params;
  const key = accessKey?.trim();

  if (!key) {
    return NextResponse.json({ error: "Access key required" }, { status: 400 });
  }

  const settings = await prisma.clientSettings.findUnique({
    where: { clientAccessKey: key },
    include: {
      client: {
        select: { agencyId: true, domain: true, name: true },
      },
    },
  });

  if (!settings?.client) {
    return NextResponse.json({ error: "Portal not found" }, { status: 404 });
  }

  if (!settings.shareWithClient) {
    return NextResponse.json({ error: "Client portal is not enabled" }, { status: 403 });
  }

  const network = await buildCompetitiveIntelligenceNetwork(settings.client.agencyId);

  if (!network.exclusiveAccess) {
    return NextResponse.json(
      { error: "Network insights not yet available" },
      { status: 403 }
    );
  }

  const industry = inferIndustry(settings.client.domain, settings.client.name);
  const portalInsights = buildPortalNetworkInsights(network, industry);

  return NextResponse.json(portalInsights);
}
