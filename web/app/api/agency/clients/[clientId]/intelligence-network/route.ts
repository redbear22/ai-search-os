import { NextResponse } from "next/server";
import { buildClientNetworkComparison } from "@/lib/competitive-intelligence-network";
import { requireAgencyAccess } from "@/lib/workspace";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({ clientId });
  if (access instanceof NextResponse) return access;

  const comparison = await buildClientNetworkComparison(access.agencyId, clientId);

  if (!comparison) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (!comparison.network.exclusiveAccess) {
    return NextResponse.json(
      { error: "Network insights require at least one active client" },
      { status: 403 }
    );
  }

  return NextResponse.json(comparison);
}
