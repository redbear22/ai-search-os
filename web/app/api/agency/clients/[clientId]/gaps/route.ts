import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({ clientId });
  if (access instanceof NextResponse) return access;

  const gaps = await prisma.gap.findMany({
    where: { clientId, status: { not: "resolved" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      layer: true,
      severity: true,
      description: true,
      suggestedOwner: true,
    },
  });

  return NextResponse.json({ gaps });
}
