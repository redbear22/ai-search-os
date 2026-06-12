import type { PlanType } from "@prisma/client";

export const TIERS = {
  free: { rank: 0, name: 'Free' },
  starter: { rank: 1, name: 'Starter', price: 49 },
  pro: { rank: 2, name: 'Pro', price: 149 },
  agency: { rank: 3, name: 'Agency', price: 399 },
  enterprise: { rank: 4, name: 'Enterprise', price: 'Custom' },
} as const;

export type TierKey = keyof typeof TIERS;
export type Tier = TierKey;

export const FEATURES = {
  // Core (all tiers)
  runAudit: { free: true, starter: true, pro: true, agency: true, enterprise: true },
  viewGaps: { free: true, starter: true, pro: true, agency: true, enterprise: true },
  localStorageSave: { free: true, starter: true, pro: true, agency: true, enterprise: true },

  // Starter unlocks
  cloudSave: { free: false, starter: true, pro: true, agency: true, enterprise: true },
  history30Days: { free: false, starter: true, pro: true, agency: true, enterprise: true },
  singleDomain: { free: false, starter: true, pro: true, agency: true, enterprise: true },

  // Pro unlocks
  aiFixGeneration: { free: false, starter: false, pro: true, agency: true, enterprise: true },
  teamSharing: { free: false, starter: false, pro: true, agency: true, enterprise: true },
  pdfExport: { free: false, starter: false, pro: true, agency: true, enterprise: true },
  fiveDomains: { free: false, starter: false, pro: true, agency: true, enterprise: true },
  competitorTracking10: { free: false, starter: false, pro: true, agency: true, enterprise: true },

  // Agency unlocks
  whiteLabel: { free: false, starter: false, pro: false, agency: true, enterprise: true },
  clientPortals: { free: false, starter: false, pro: false, agency: true, enterprise: true },
  apiAccess: { free: false, starter: false, pro: false, agency: true, enterprise: true },
  twentyFiveDomains: { free: false, starter: false, pro: false, agency: true, enterprise: true },

  // Enterprise unlocks
  sso: { free: false, starter: false, pro: false, agency: false, enterprise: true },
  sla: { free: false, starter: false, pro: false, agency: false, enterprise: true },
  customIntegrations: { free: false, starter: false, pro: false, agency: false, enterprise: true },
};

export type FeatureKey = keyof typeof FEATURES;

function tiersByRank(): TierKey[] {
  return (Object.keys(TIERS) as TierKey[]).sort(
    (a, b) => TIERS[a].rank - TIERS[b].rank
  );
}

export function hasFeature(feature: keyof typeof FEATURES, userTier: keyof typeof TIERS): boolean {
  return FEATURES[feature]?.[userTier] ?? false;
}

export function getNextTier(currentTier: keyof typeof TIERS): keyof typeof TIERS | null {
  const tiers = Object.keys(TIERS) as (keyof typeof TIERS)[];
  const currentIndex = tiers.indexOf(currentTier);
  return tiers[currentIndex + 1] || null;
}

/** Lowest tier that unlocks a feature, walking TIERS by rank. */
export function getRequiredTierForFeature(feature: FeatureKey): Tier {
  for (const tier of tiersByRank()) {
    if (hasFeature(feature, tier)) return tier;
  }
  return "enterprise";
}

/** Lowest tier that unlocks a feature (for upgrade CTAs). */
export function getMinTierForFeature(feature: FeatureKey): TierKey | null {
  for (const tier of tiersByRank()) {
    if (hasFeature(feature, tier)) return tier;
  }
  return null;
}

export const FEATURE_LABELS: Partial<Record<keyof typeof FEATURES, string>> = {
  localStorageSave: "browser save",
  cloudSave: "cloud sync",
  aiFixGeneration: "AI-generated fixes",
  whiteLabel: "white-label reports",
  pdfExport: "PDF export",
};

/**
 * Maps Prisma PlanType to feature-flag tier keys.
 *
 * The `free` tier is for unauthenticated users or trials without a subscription.
 * Paid Starter subscribers use PlanType `FREE` → `starter` (see pricing-plans.ts).
 *
 * Domain slot limits follow DOMAIN_LIMITS in domain-limits.ts (starter = FREE = 1 domain).
 */
export function resolveUserTierFromPlanType(plan: PlanType): TierKey {
  switch (plan) {
    case "FREE":
      return "starter";
    case "PRO":
      return "pro";
    case "AGENCY":
      return "agency";
    case "ENTERPRISE":
      return "enterprise";
  }
}
