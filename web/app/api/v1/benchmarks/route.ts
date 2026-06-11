import type { NextRequest } from "next/server";
import { buildCompetitiveIntelligenceNetwork } from "@/lib/competitive-intelligence-network";
import { requireScope } from "@/lib/api-v1/auth";
import { apiV1Success } from "@/lib/api-v1/response";
import { withApiV1 } from "@/lib/api-v1/handler";

export const GET = withApiV1(async (request: NextRequest, _context, auth) => {
  const scopeError = requireScope(auth, "insights:read");
  if (scopeError) return scopeError;

  const network = await buildCompetitiveIntelligenceNetwork(auth.agencyId);

  return apiV1Success({
    benchmarks: network.benchmarks,
    insights: network.insights,
    citationPlatforms: network.citationPlatforms,
    networkStrength: network.networkEffects.networkStrength,
    computedAt: network.computedAt,
  });
});
