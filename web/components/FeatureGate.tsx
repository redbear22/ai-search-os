"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import {
  FEATURE_LABELS,
  TIERS,
  getRequiredTierForFeature,
  hasFeature,
  type FeatureKey,
  type Tier,
} from "@/lib/feature-flags";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";

export function isFeatureUnlocked(feature: FeatureKey, tier: Tier): boolean {
  return hasFeature(feature, tier);
}

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  showPreview?: boolean;
  showInfo?: boolean;
}

function UpgradeInfo({
  feature,
  requiredTier,
  showInfo,
}: {
  feature: FeatureKey;
  requiredTier: Tier;
  showInfo: boolean;
}) {
  const label = FEATURE_LABELS[feature] ?? feature;

  return (
    <p className="text-xs text-muted-foreground">
      {label} unlocks on{" "}
      <Link
        href={`/pricing?plan=${requiredTier}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {TIERS[requiredTier].name}
      </Link>
      .{" "}
      {showInfo && (
        <Link
          href="/pricing"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Compare plans
        </Link>
      )}
    </p>
  );
}

export function FeatureGate({
  feature,
  children,
  title,
  description,
  className,
  showPreview = true,
  showInfo = true,
}: FeatureGateProps) {
  const { tier = "free", isLoading } = useUser();
  const [showDetails, setShowDetails] = useState(false);

  if (isLoading) {
    return (
      <div
        className={cn("animate-pulse rounded-lg bg-muted", title ? "h-32" : "h-10", className)}
        aria-hidden
      />
    );
  }

  const hasAccess = isFeatureUnlocked(feature, tier as Tier);
  const requiredTier = getRequiredTierForFeature(feature);

  if (hasAccess) {
    if (!title && !description) {
      return <>{children}</>;
    }
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4 shadow-sm",
          className
        )}
      >
        {title && <h3 className="text-sm font-semibold">{title}</h3>}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <div>{children}</div>
      </div>
    );
  }

  if (title || description) {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4 shadow-sm",
          className
        )}
      >
        {title && <h3 className="text-sm font-semibold">{title}</h3>}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {showPreview && (
          <div className="pointer-events-none select-none opacity-50">{children}</div>
        )}
        <UpgradeInfo feature={feature} requiredTier={requiredTier} showInfo={showInfo} />
      </div>
    );
  }

  return (
    <div className={cn("relative group", className)}>
      {showPreview && (
        <div className="opacity-50 transition-opacity">{children}</div>
      )}

      <div className="absolute right-2 top-2">
        <button
          type="button"
          onMouseEnter={() => setShowDetails(true)}
          onMouseLeave={() => setShowDetails(false)}
          className="text-gray-400 transition hover:text-gray-600"
          aria-label="Feature availability"
        >
          <InformationCircleIcon className="h-5 w-5" />
        </button>

        {showDetails && (
          <div className="absolute right-0 z-10 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-lg">
            <p className="text-xs text-gray-600">
              This feature is included in{" "}
              <strong>{TIERS[requiredTier].name}</strong> plans and above.
            </p>
            {showInfo && (
              <a
                href="/pricing"
                className="mt-2 inline-block text-xs text-gray-500 hover:text-gray-700"
              >
                Compare plans →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
