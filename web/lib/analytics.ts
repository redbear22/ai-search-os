// Anonymous data collection for building AI training dataset
// No PII. No API keys. Just aggregated patterns.

import type { Gap } from "@/types/gap";
import {
  trackAuditComplete as gaTrackAuditComplete,
  trackFixGenerate as gaTrackFixGenerate,
} from "@/lib/google-analytics";

function normalizeGapSource(source?: string): string {
  if (!source?.trim()) return "unknown";

  const trimmed = source.trim();
  if (trimmed.includes(".")) {
    return trimmed.replace(/^https?:\/\//, "").split("/")[0] || "unknown";
  }

  return trimmed.slice(0, 64);
}

const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
const ANALYTICS_ENDPOINT =
  process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || "/api/analytics/track";

export const ANALYTICS_CONSENT_KEY = "analytics_consent";
export const ANALYTICS_ENABLED_KEY = "analytics_enabled";

function isTrackingEnabled(): boolean {
  if (!ANALYTICS_ENABLED) return false;
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ANALYTICS_ENABLED_KEY) === "true";
}

export type AnalyticsEventType =
  | "audit_completed"
  | "gap_detected"
  | "fix_generated"
  | "fix_accepted"
  | "fix_rejected"
  | "outcome_reported";

export type FixOutcome = "worked" | "didnt_work" | "partial";

export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  layer?: string;
  severity?: string;
  gapCount?: number;
  fixLength?: number;
  source?: string;
  outcome?: FixOutcome;
  timestamp: string;
  sessionId: string;
}

let sessionId: string | null = null;
const trackedGapIds = new Set<string>();

function getSessionId(): string {
  if (sessionId) return sessionId;

  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("analytics_session_id");
    if (stored) {
      sessionId = stored;
      return sessionId;
    }
  }

  sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  if (typeof window !== "undefined") {
    localStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
}

export async function trackEvent(
  event: Omit<AnalyticsEvent, "timestamp" | "sessionId">
): Promise<void> {
  if (!isTrackingEnabled()) return;

  const fullEvent: AnalyticsEvent = {
    ...event,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
  };

  try {
    await fetch(ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullEvent),
    });
  } catch {
    // Silent fail - analytics never blocks user
  }

  if (typeof window !== "undefined") {
    const localEvents = JSON.parse(
      localStorage.getItem("analytics_events") || "[]"
    ) as AnalyticsEvent[];
    localEvents.push(fullEvent);
    if (localEvents.length > 1000) localEvents.shift();
    localStorage.setItem("analytics_events", JSON.stringify(localEvents));
  }
}

export function trackAuditCompleted(_auditData: unknown, gapCount: number): void {
  void trackEvent({
    eventType: "audit_completed",
    gapCount,
  });
  gaTrackAuditComplete();
}

export function trackGapsDetected(
  gaps: Pick<Gap, "id" | "layer" | "severity" | "source">[]
): void {
  gaps.forEach((gap) => {
    if (trackedGapIds.has(gap.id)) return;
    trackedGapIds.add(gap.id);

    void trackEvent({
      eventType: "gap_detected",
      layer: gap.layer,
      severity: gap.severity,
      source: normalizeGapSource(gap.source),
    });
  });
}

export function trackFixGenerated(
  gap: Pick<Gap, "layer" | "severity">,
  fixLength: number
): void {
  void trackEvent({
    eventType: "fix_generated",
    layer: gap.layer,
    severity: gap.severity,
    fixLength,
  });
  gaTrackFixGenerate();
}

export function trackFixAccepted(gap: Pick<Gap, "layer" | "severity">): void {
  void trackEvent({
    eventType: "fix_accepted",
    layer: gap.layer,
    severity: gap.severity,
  });
}

export function trackFixRejected(gap: Pick<Gap, "layer" | "severity">): void {
  void trackEvent({
    eventType: "fix_rejected",
    layer: gap.layer,
    severity: gap.severity,
  });
}

export function trackFixOutcome(
  _gapId: string,
  outcome: FixOutcome
): void {
  void trackEvent({
    eventType: "outcome_reported",
    outcome,
  });
}
