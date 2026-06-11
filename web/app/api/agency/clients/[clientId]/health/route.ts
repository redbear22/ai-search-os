import { NextResponse } from "next/server";
import { buildClientHealthDashboard } from "@/lib/client-health";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({ clientId });
  if (access instanceof NextResponse) return access;

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: access.agencyId },
    include: {
      audits: { orderBy: { createdAt: "desc" }, take: 6 },
      gaps: {
        orderBy: { createdAt: "desc" },
        select: {
          layer: true,
          severity: true,
          title: true,
          description: true,
          suggestedTimeline: true,
          status: true,
        },
      },
      actionPlans: {
        select: { status: true, description: true },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const dashboard = buildClientHealthDashboard({
    clientId: client.id,
    clientName: client.name,
    audits: client.audits,
    gaps: client.gaps,
    actions: client.actionPlans,
  });

  return NextResponse.json(dashboard);
}
