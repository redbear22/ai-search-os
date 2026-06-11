import type { StoredAnalyticsEvent } from "@/lib/analytics-server";

export interface AnalyticsDashboardStats {
  totalAudits: number;
  totalEvents: number;
  auditsOverTime: { date: string; count: number }[];
  gapsByLayer: { layer: string; count: number }[];
  gapsBySeverity: { severity: string; count: number }[];
  fixAcceptanceRate: number;
  fixesGenerated: number;
  fixesAccepted: number;
  fixesRejected: number;
  topGapSources: { source: string; count: number }[];
  recentActivity: StoredAnalyticsEvent[];
}

const LAYER_ORDER = ["authority", "clarity", "discoverability", "trust"];
const SEVERITY_ORDER = ["critical", "high", "medium", "low"];

function eventTime(event: StoredAnalyticsEvent): string {
  return event.receivedAt || event.timestamp;
}

function countByField(
  events: StoredAnalyticsEvent[],
  field: "layer" | "severity" | "source"
): { name: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const event of events) {
    const value = event[field]?.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}

export function buildAnalyticsDashboard(
  events: StoredAnalyticsEvent[]
): AnalyticsDashboardStats {
  const auditEvents = events.filter((e) => e.eventType === "audit_completed");
  const gapEvents = events.filter((e) => e.eventType === "gap_detected");
  const fixesGenerated = events.filter((e) => e.eventType === "fix_generated").length;
  const fixesAccepted = events.filter((e) => e.eventType === "fix_accepted").length;
  const fixesRejected = events.filter((e) => e.eventType === "fix_rejected").length;

  const auditsByDay = new Map<string, number>();
  for (const event of auditEvents) {
    const day = eventTime(event).slice(0, 10);
    auditsByDay.set(day, (auditsByDay.get(day) ?? 0) + 1);
  }

  const auditsOverTime = Array.from(auditsByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const layerCounts = countByField(gapEvents, "layer");
  const gapsByLayer = layerCounts
    .map(({ name, count }) => ({ layer: name, count }))
    .sort((a, b) => {
      const ai = LAYER_ORDER.indexOf(a.layer);
      const bi = LAYER_ORDER.indexOf(b.layer);
      if (ai === -1 && bi === -1) return b.count - a.count;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  const severityCounts = countByField(gapEvents, "severity");
  const gapsBySeverity = severityCounts
    .map(({ name, count }) => ({ severity: name, count }))
    .sort((a, b) => {
      const ai = SEVERITY_ORDER.indexOf(a.severity);
      const bi = SEVERITY_ORDER.indexOf(b.severity);
      if (ai === -1 && bi === -1) return b.count - a.count;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  const sourceCounts = countByField(gapEvents, "source");
  const topGapSources = sourceCounts
    .filter(({ name }) => name !== "unknown")
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(({ name, count }) => ({ source: name, count }));

  const fixAcceptanceRate =
    fixesGenerated > 0 ? Math.round((fixesAccepted / fixesGenerated) * 1000) / 10 : 0;

  const recentActivity = [...events]
    .sort((a, b) => eventTime(b).localeCompare(eventTime(a)))
    .slice(0, 50);

  return {
    totalAudits: auditEvents.length,
    totalEvents: events.length,
    auditsOverTime,
    gapsByLayer,
    gapsBySeverity,
    fixAcceptanceRate,
    fixesGenerated,
    fixesAccepted,
    fixesRejected,
    topGapSources,
    recentActivity,
  };
}

export function normalizeGapSource(source?: string): string {
  if (!source?.trim()) return "unknown";

  const trimmed = source.trim();
  if (trimmed.includes(".")) {
    return trimmed.replace(/^https?:\/\//, "").split("/")[0] || "unknown";
  }

  return trimmed.slice(0, 64);
}

export function getDemoAnalyticsEvents(): StoredAnalyticsEvent[] {
  const sessionId = "demo_session";
  const now = Date.now();
  const day = (offset: number) =>
    new Date(now - offset * 86_400_000).toISOString();

  const events: StoredAnalyticsEvent[] = [
    {
      eventType: "audit_completed",
      gapCount: 12,
      timestamp: day(6),
      receivedAt: day(6),
      sessionId,
    },
    {
      eventType: "audit_completed",
      gapCount: 8,
      timestamp: day(4),
      receivedAt: day(4),
      sessionId,
    },
    {
      eventType: "audit_completed",
      gapCount: 15,
      timestamp: day(1),
      receivedAt: day(1),
      sessionId,
    },
    {
      eventType: "gap_detected",
      layer: "authority",
      severity: "high",
      source: "wirecutter.com",
      timestamp: day(5),
      receivedAt: day(5),
      sessionId,
    },
    {
      eventType: "gap_detected",
      layer: "authority",
      severity: "critical",
      source: "wirecutter.com",
      timestamp: day(5),
      receivedAt: day(5),
      sessionId,
    },
    {
      eventType: "gap_detected",
      layer: "clarity",
      severity: "medium",
      source: "chatgpt.com",
      timestamp: day(4),
      receivedAt: day(4),
      sessionId,
    },
    {
      eventType: "gap_detected",
      layer: "discoverability",
      severity: "high",
      source: "seriouseats.com",
      timestamp: day(3),
      receivedAt: day(3),
      sessionId,
    },
    {
      eventType: "gap_detected",
      layer: "trust",
      severity: "low",
      source: "reddit.com",
      timestamp: day(2),
      receivedAt: day(2),
      sessionId,
    },
    {
      eventType: "fix_generated",
      layer: "authority",
      severity: "high",
      fixLength: 420,
      timestamp: day(4),
      receivedAt: day(4),
      sessionId,
    },
    {
      eventType: "fix_generated",
      layer: "clarity",
      severity: "medium",
      fixLength: 310,
      timestamp: day(3),
      receivedAt: day(3),
      sessionId,
    },
    {
      eventType: "fix_accepted",
      layer: "authority",
      severity: "high",
      timestamp: day(3),
      receivedAt: day(3),
      sessionId,
    },
    {
      eventType: "fix_rejected",
      layer: "clarity",
      severity: "medium",
      timestamp: day(2),
      receivedAt: day(2),
      sessionId,
    },
  ];

  return events;
}

export interface AnalyticsDataApiResponse {
  summary: {
    totalAudits: number;
    totalGaps: number;
    totalFixesGenerated: number;
    totalFixesAccepted: number;
    fixAcceptanceRate: number;
    totalOutcomes: number;
  };
  gapsByLayer: {
    discoverability: number;
    clarity: number;
    authority: number;
    trust: number;
  };
  gapsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  outcomesByResult: {
    worked: number;
    partial: number;
    didnt_work: number;
  };
  timeSeries: {
    audits: { date: string; count: number }[];
    gaps: { date: string; count: number }[];
  };
  topSources: { source: string; count: number }[];
  recentEvents: StoredAnalyticsEvent[];
}

function lastNDays(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return date.toISOString().split("T")[0];
  });
}

function eventDay(event: StoredAnalyticsEvent): string {
  return eventTime(event).slice(0, 10);
}

export function buildAnalyticsDataApiResponse(
  events: StoredAnalyticsEvent[]
): AnalyticsDataApiResponse {
  const audits = events.filter((e) => e.eventType === "audit_completed");
  const gaps = events.filter((e) => e.eventType === "gap_detected");
  const fixesGenerated = events.filter((e) => e.eventType === "fix_generated");
  const fixesAccepted = events.filter((e) => e.eventType === "fix_accepted");
  const outcomes = events.filter((e) => e.eventType === "outcome_reported");

  const gapsByLayer = {
    discoverability: gaps.filter((g) => g.layer === "discoverability").length,
    clarity: gaps.filter((g) => g.layer === "clarity").length,
    authority: gaps.filter((g) => g.layer === "authority").length,
    trust: gaps.filter((g) => g.layer === "trust").length,
  };

  const gapsBySeverity = {
    critical: gaps.filter((g) => g.severity === "critical").length,
    high: gaps.filter((g) => g.severity === "high").length,
    medium: gaps.filter((g) => g.severity === "medium").length,
    low: gaps.filter((g) => g.severity === "low").length,
  };

  const fixAcceptanceRate =
    fixesGenerated.length > 0
      ? Math.round((fixesAccepted.length / fixesGenerated.length) * 100)
      : 0;

  const outcomesByResult = {
    worked: outcomes.filter((o) => o.outcome === "worked").length,
    partial: outcomes.filter((o) => o.outcome === "partial").length,
    didnt_work: outcomes.filter((o) => o.outcome === "didnt_work").length,
  };

  const last30Days = lastNDays(30);

  const timeSeries = {
    audits: last30Days.map((day) => ({
      date: day,
      count: audits.filter((a) => eventDay(a) === day).length,
    })),
    gaps: last30Days.map((day) => ({
      date: day,
      count: gaps.filter((g) => eventDay(g) === day).length,
    })),
  };

  const sourceMap = new Map<string, number>();
  for (const gap of gaps) {
    const source = gap.source?.trim();
    if (!source || source === "unknown") continue;
    sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);
  }

  const topSources = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recentEvents = [...events]
    .sort((a, b) => eventTime(b).localeCompare(eventTime(a)))
    .slice(0, 50);

  return {
    summary: {
      totalAudits: audits.length,
      totalGaps: gaps.length,
      totalFixesGenerated: fixesGenerated.length,
      totalFixesAccepted: fixesAccepted.length,
      fixAcceptanceRate,
      totalOutcomes: outcomes.length,
    },
    gapsByLayer,
    gapsBySeverity,
    outcomesByResult,
    timeSeries,
    topSources,
    recentEvents,
  };
}

export function emptyAnalyticsDataApiResponse(): AnalyticsDataApiResponse {
  const last30Days = lastNDays(30).map((day) => ({ date: day, count: 0 }));

  return {
    summary: {
      totalAudits: 0,
      totalGaps: 0,
      totalFixesGenerated: 0,
      totalFixesAccepted: 0,
      fixAcceptanceRate: 0,
      totalOutcomes: 0,
    },
    gapsByLayer: {
      discoverability: 0,
      clarity: 0,
      authority: 0,
      trust: 0,
    },
    gapsBySeverity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
    outcomesByResult: {
      worked: 0,
      partial: 0,
      didnt_work: 0,
    },
    timeSeries: {
      audits: last30Days,
      gaps: last30Days,
    },
    topSources: [],
    recentEvents: [],
  };
}
