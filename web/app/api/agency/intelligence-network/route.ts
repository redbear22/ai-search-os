import { NextResponse } from "next/server";
import { buildCompetitiveIntelligenceNetwork } from "@/lib/competitive-intelligence-network";
import { requireAgencyAccess } from "@/lib/workspace";

export async function GET() {
  const access = await requireAgencyAccess();
  if (access instanceof NextResponse) return access;

  const network = await buildCompetitiveIntelligenceNetwork(access.agencyId);

  if (!network.exclusiveAccess) {
    return NextResponse.json(
      { error: "Network insights require at least one active client" },
      { status: 403 }
    );
  }

  return NextResponse.json(network);
}
