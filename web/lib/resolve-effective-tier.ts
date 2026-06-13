import type { PlanType } from "@prisma/client";
import { DOMAIN_LIMITS } from "@/lib/domain-limits";
import { resolveUserTierFromPlanType, type TierKey } from "@/lib/feature-flags";
import { prisma } from "@/lib/prisma";

/** Platform ADMIN users get enterprise-tier access for testing. */
export function isAdminUnlimitedAccess(role?: string | null): boolean {
  return role === "ADMIN";
}

export function resolveEffectiveTier(
  plan: PlanType,
  userRole?: string | null
): TierKey {
  if (isAdminUnlimitedAccess(userRole)) {
    return "enterprise";
  }
  return resolveUserTierFromPlanType(plan);
}

export function resolveEffectiveDomainLimit(
  plan: PlanType,
  userRole?: string | null
): number {
  if (isAdminUnlimitedAccess(userRole)) {
    return DOMAIN_LIMITS.ENTERPRISE;
  }
  return DOMAIN_LIMITS[plan];
}

/** True when an agency owner or member is a platform ADMIN. */
export async function agencyHasPlatformAdmin(
  agencyId: string
): Promise<boolean> {
  const admin = await prisma.user.findFirst({
    where: {
      role: "ADMIN",
      OR: [{ agencyId }, { ownedAgencies: { some: { id: agencyId } } }],
    },
    select: { id: true },
  });
  return Boolean(admin);
}

export async function shouldBypassSubscriptionLimits(options: {
  userRole?: string | null;
  agencyId?: string;
}): Promise<boolean> {
  if (isAdminUnlimitedAccess(options.userRole)) {
    return true;
  }
  if (options.agencyId) {
    return agencyHasPlatformAdmin(options.agencyId);
  }
  return false;
}
