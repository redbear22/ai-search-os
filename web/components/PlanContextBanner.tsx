"use client";

import { TIERS, getNextTier, type Tier } from "@/lib/feature-flags";
import type { TierResource } from "@/components/TierUpgradeBanner";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

type ResourceInfo = {
  label: string;
  nextInfo: string;
  feature: string;
};

const RESOURCE_LABELS: Record<TierResource, string> = {
  domains: "domains",
  team_seats: "team members",
  competitors: "competitors",
  prompts: "AI prompts",
  history_days: "days of history",
};

function getNextInfo(resource: TierResource, nextTier: Tier): string {
  const nextLimits: Record<TierResource, string> = {
    domains:
      nextTier === "starter"
        ? "1 domain"
        : nextTier === "pro"
          ? "5 domains"
          : nextTier === "agency"
            ? "25 domains"
            : "custom limits",
    team_seats: nextTier === "pro" ? "5 seats" : "unlimited seats",
    competitors:
      nextTier === "pro"
        ? "10 competitors"
        : nextTier === "agency"
          ? "25 competitors"
          : "unlimited competitors",
    prompts:
      nextTier === "pro"
        ? "100 prompts"
        : nextTier === "agency"
          ? "300 prompts"
          : "unlimited prompts",
    history_days:
      nextTier === "starter"
        ? "30 days of history"
        : nextTier === "pro"
          ? "90 days of history"
          : nextTier === "agency"
            ? "365 days of history"
            : "unlimited history",
  };
  return nextLimits[resource];
}

function getUpgradeFeature(resource: TierResource, nextTier: Tier): string {
  const features: Record<TierResource, string> = {
    domains:
      nextTier === "starter"
        ? "cloud save"
        : nextTier === "pro"
          ? "team sharing and AI fixes"
          : "white-label client portals",
    team_seats:
      nextTier === "pro"
        ? "collaborative workspaces"
        : "role-based access control",
    competitors:
      nextTier === "pro" ? "share of voice tracking" : "market intelligence",
    prompts:
      nextTier === "pro" ? "batch gap analysis" : "automated fix generation",
    history_days:
      nextTier === "starter"
        ? "cloud sync across devices"
        : nextTier === "pro"
          ? "extended audit history"
          : "full year retention",
  };
  return features[resource];
}

function getResourceInfo(resource: TierResource, nextTier: Tier): ResourceInfo {
  return {
    label: RESOURCE_LABELS[resource],
    nextInfo: getNextInfo(resource, nextTier),
    feature: getUpgradeFeature(resource, nextTier),
  };
}

interface PlanContextBannerProps {
  currentTier: Tier;
  resource: TierResource;
  currentUsage: number;
  limit: number;
  onDismiss?: () => void;
}

export function PlanContextBanner({
  currentTier,
  resource,
  currentUsage,
  limit,
  onDismiss,
}: PlanContextBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const nextTier = getNextTier(currentTier);

  if (dismissed || !nextTier) return null;

  const info = getResourceInfo(resource, nextTier);
  const percentageUsed = limit > 0 ? (currentUsage / limit) * 100 : 0;
  const isInformational = percentageUsed >= 80;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`my-4 rounded-lg border p-4 ${
        isInformational
          ? "border-gray-200 bg-gray-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <ChartBarIcon
            className={`mt-0.5 h-5 w-5 ${
              isInformational ? "text-gray-500" : "text-gray-400"
            }`}
          />
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-medium">
                {currentUsage}/{limit} {info.label}
              </span>{" "}
              used
              {isInformational && " — approaching plan limit"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {TIERS[nextTier].name} plans include {info.nextInfo} and{" "}
              {info.feature}.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
          <a
            href="/pricing"
            className="text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            Compare plans →
          </a>
        </div>
      </div>
      {isInformational && (
        <div className="mt-2">
          <div className="h-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gray-400 transition-all"
              style={{ width: `${Math.min(100, percentageUsed)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
