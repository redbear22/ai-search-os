"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  FEATURES,
  FEATURE_LABELS,
  TIERS,
  getMinTierForFeature,
  hasFeature,
  type TierKey,
} from "@/lib/feature-flags";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";

interface ProgressiveFeatureGateProps {
  feature: keyof typeof FEATURES;
  children: ReactNode;
  fallback?: ReactNode;
  compact?: boolean;
  className?: string;
  customUpgradeMessage?: string;
}

export function resolveFeatureGate(
  feature: keyof typeof FEATURES,
  tier: TierKey
): "allowed" | "denied" {
  return hasFeature(feature, tier) ? "allowed" : "denied";
}

function FeatureUpgradeCta({
  feature,
  currentTier,
  compact,
  className,
  customUpgradeMessage,
}: {
  feature: keyof typeof FEATURES;
  currentTier: TierKey;
  compact?: boolean;
  className?: string;
  customUpgradeMessage?: string;
}) {
  const upgradeTier = getMinTierForFeature(feature);
  if (!upgradeTier) return null;

  const label = FEATURE_LABELS[feature] ?? feature;
  const tierName = TIERS[upgradeTier].name;

  if (compact) {
    return (
      <Link
        href={`/pricing?plan=${upgradeTier}`}
        className={cn(
          "text-sm font-medium text-primary underline-offset-4 hover:underline",
          className
        )}
      >
        Upgrade to {tierName} for {label}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border/80 bg-muted/30 p-4",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        {customUpgradeMessage ??
          (currentTier === "free"
            ? `Sign up for ${tierName} to unlock ${label}.`
            : `Upgrade to ${tierName} to unlock ${label}.`)}
      </p>
      <Link
        href={`/pricing?plan=${upgradeTier}`}
        className="mt-2 inline-flex rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        View {tierName} plans
      </Link>
    </div>
  );
}

export function ProgressiveFeatureGate({
  feature,
  children,
  fallback,
  compact,
  className,
  customUpgradeMessage,
}: ProgressiveFeatureGateProps) {
  const { tier, isLoading } = useUser();

  if (isLoading) return null;

  if (resolveFeatureGate(feature, tier) === "allowed") {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return (
    <FeatureUpgradeCta
      feature={feature}
      currentTier={tier}
      compact={compact}
      className={className}
      customUpgradeMessage={customUpgradeMessage}
    />
  );
}
