import type { PlanType } from "@prisma/client";
import {
  getDomainGroupKey,
  normalizeDomain,
  normalizeDomainHost,
} from "@/lib/domain-normalization";
import { prisma } from "@/lib/prisma";

/** PlanType keys — FREE is the starter tier (1 domain). */
export const DOMAIN_LIMITS: Record<PlanType, number> = {
  FREE: 1,
  PRO: 5,
  AGENCY: 25,
  ENTERPRISE: Infinity,
};

export type DomainLimitResult = {
  allowed: boolean;
  limit: number;
  current: number;
  message?: string;
};

export type CheckDomainLimitOptions = {
  treatAsSeparate?: boolean;
  excludeDomainId?: string;
};

/** Slot key for plan counting — root domain unless treatAsSeparate. */
export function getDomainSlotKey(url: string, treatAsSeparate: boolean): string {
  if (treatAsSeparate) {
    return normalizeDomainHost(url);
  }
  return getDomainGroupKey(url);
}

export function normalizeDomainForStorage(
  url: string,
  treatAsSeparate: boolean
): string {
  return treatAsSeparate ? normalizeDomainHost(url) : normalizeDomain(url);
}

async function resolveAgencyPlan(
  userId: string
): Promise<{ agencyId: string; plan: PlanType } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      agencyId: true,
      agency: { select: { subscription: { select: { plan: true } } } },
      ownedAgencies: {
        select: { id: true, subscription: { select: { plan: true } } },
        take: 1,
      },
    },
  });

  if (!user) return null;

  const owned = user.ownedAgencies[0];
  const agencyId = user.agencyId ?? owned?.id ?? null;
  if (!agencyId) return null;

  const plan =
    user.agency?.subscription?.plan ??
    owned?.subscription?.plan ??
    ("FREE" as PlanType);

  return { agencyId, plan };
}

function countUniqueSlots(
  domains: { url: string; treatAsSeparate: boolean }[]
): Set<string> {
  const slots = new Set<string>();
  for (const domain of domains) {
    const key = getDomainSlotKey(domain.url, domain.treatAsSeparate);
    if (key) slots.add(key);
  }
  return slots;
}

export async function checkDomainLimit(
  userId: string,
  newDomainUrl: string,
  options: CheckDomainLimitOptions = {}
): Promise<DomainLimitResult> {
  const treatAsSeparate = options.treatAsSeparate ?? false;
  const normalized = normalizeDomainForStorage(newDomainUrl, treatAsSeparate);
  if (!normalized) {
    return {
      allowed: false,
      limit: 0,
      current: 0,
      message: "Invalid domain URL",
    };
  }

  const resolved = await resolveAgencyPlan(userId);
  if (!resolved) {
    return {
      allowed: false,
      limit: 0,
      current: 0,
      message: "No agency workspace found",
    };
  }

  const limit = DOMAIN_LIMITS[resolved.plan];
  const newSlot = getDomainSlotKey(normalized, treatAsSeparate);

  const existingDomains = await prisma.domain.findMany({
    where: {
      agencyId: resolved.agencyId,
      isActive: true,
      ...(options.excludeDomainId ? { id: { not: options.excludeDomainId } } : {}),
    },
    select: { url: true, treatAsSeparate: true },
  });

  const slots = countUniqueSlots(existingDomains);
  const current = slots.size;

  if (slots.has(newSlot)) {
    return { allowed: true, limit, current };
  }

  if (current >= limit) {
    return {
      allowed: false,
      limit,
      current,
      message: `Domain limit reached (${current}/${limit})`,
    };
  }

  return { allowed: true, limit, current };
}
