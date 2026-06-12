import type { PlanType } from "@prisma/client";
import { NextResponse } from "next/server";
import { DOMAIN_LIMITS } from "@/lib/domain-limits";
import { resolveUserTierFromPlanType } from "@/lib/feature-flags";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ tier: "free" as const });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      agencyId: true,
      agency: { select: { subscription: { select: { plan: true } } } },
      ownedAgencies: {
        select: { subscription: { select: { plan: true } } },
        take: 1,
      },
    },
  });

  const plan: PlanType =
    user?.agency?.subscription?.plan ??
    user?.ownedAgencies[0]?.subscription?.plan ??
    "FREE";

  return NextResponse.json({
    tier: resolveUserTierFromPlanType(plan),
    plan,
    domainLimit: DOMAIN_LIMITS[plan],
  });
}
