import { NextResponse } from "next/server";
import { fetchPredictiveROIForClient } from "@/lib/predictive-roi";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({ clientId });
  if (access instanceof NextResponse) return access;

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: access.agencyId },
    select: { id: true, name: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const roi = await fetchPredictiveROIForClient(client.id, client.name);
  if (!roi) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json(roi);
}
