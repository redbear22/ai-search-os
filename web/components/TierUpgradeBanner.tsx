"use client";

import { TIERS, getNextTier, type Tier } from "@/lib/feature-flags";
import { X } from "lucide-react";
import { useState } from "react";

export type TierResource =
  | "domains"
  | "team_seats"
  | "competitors"
  | "prompts"
  | "history_days";

const RESOURCE_LABELS: Record<TierResource, string> = {
  domains: "domains",
  team_seats: "team members",
  competitors: "competitors",
  prompts: "AI prompts",
  history_days: "days of history",
};

export function formatTierResourceLabel(resource: TierResource): string {
  return RESOURCE_LABELS[resource];
}

function getResourceInfo(resource: TierResource, nextTier: Tier) {
  const nextLimits: Record<TierResource, string | number> = {
    domains: nextTier === "pro" ? 5 : nextTier === "agency" ? 25 : "unlimited",
    team_seats: nextTier === "pro" ? 5 : "unlimited",
    competitors:
      nextTier === "pro" ? 10 : nextTier === "agency" ? 25 : "unlimited",
    prompts:
      nextTier === "pro" ? 100 : nextTier === "agency" ? 300 : "unlimited",
    history_days:
      nextTier === "pro" ? 90 : nextTier === "agency" ? 365 : "unlimited",
  };

  return {
    label: RESOURCE_LABELS[resource],
    nextLimit: nextLimits[resource],
  };
}

interface TierUpgradeBannerProps {
  currentTier: Tier;
  resource: TierResource;
  currentUsage: number;
  limit: number;
  onDismiss?: () => void;
}

export function TierUpgradeBanner({
  currentTier,
  resource,
  currentUsage,
  limit,
  onDismiss,
}: TierUpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const nextTier = getNextTier(currentTier);

  if (dismissed || !nextTier) return null;

  const resourceInfo = getResourceInfo(resource, nextTier);
  const percentageUsed = limit > 0 ? (currentUsage / limit) * 100 : 0;
  const isUrgent = percentageUsed >= 80;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`my-4 rounded-lg p-4 ${
        isUrgent
          ? "border border-yellow-200 bg-yellow-50"
          : "border border-blue-200 bg-blue-50"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3
            className={`font-semibold ${
              isUrgent ? "text-yellow-800" : "text-blue-800"
            }`}
          >
            {isUrgent
              ? `⚠️ You're at ${currentUsage}/${limit} ${resourceInfo.label}`
              : `${resourceInfo.label.charAt(0).toUpperCase() + resourceInfo.label.slice(1)} limit: ${currentUsage}/${limit}`}
          </h3>
          <p className="mt-1 text-sm text-gray-700">
            Upgrade to <strong>{TIERS[nextTier].name}</strong> for{" "}
            <strong>
              {resourceInfo.nextLimit} {resourceInfo.label}
            </strong>
            {nextTier === "agency" && " + white-label client portals"}
            {nextTier === "pro" && " + AI-generated fixes"}
            {nextTier === "starter" && " + cloud save & 30-day history"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
          <a
            href={`/pricing?plan=${nextTier}`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              isUrgent
                ? "bg-yellow-600 text-white hover:bg-yellow-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Upgrade
          </a>
        </div>
      </div>
      {isUrgent && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-yellow-200">
            <div
              className="h-full rounded-full bg-yellow-600 transition-all"
              style={{ width: `${Math.min(100, percentageUsed)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
