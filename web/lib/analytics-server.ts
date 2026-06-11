// Store analytics in JSON file (MVP).
// Simple: read the JSON file
// Better: later move to PostgreSQL for querying

import { readFile, writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
import type { AnalyticsEvent } from "@/lib/analytics";

const ALLOWED_EVENT_TYPES = new Set<AnalyticsEvent["eventType"]>([
  "audit_completed",
  "gap_detected",
  "fix_generated",
  "fix_accepted",
  "fix_rejected",
  "outcome_reported",
]);

const ALLOWED_OUTCOMES = new Set<NonNullable<AnalyticsEvent["outcome"]>>([
  "worked",
  "didnt_work",
  "partial",
]);

const MAX_EVENTS = 100_000;

export type StoredAnalyticsEvent = AnalyticsEvent & {
  receivedAt: string;
};

export function getAnalyticsFilePath(): string {
  const customPath = process.env.ANALYTICS_FILE?.trim();
  if (customPath) return path.resolve(customPath);
  return path.join(process.cwd(), "analytics-data.json");
}

export function sanitizeAnalyticsEvent(input: unknown): AnalyticsEvent | null {
  if (!input || typeof input !== "object") return null;

  const raw = input as Record<string, unknown>;
  const eventType = raw.eventType;
  if (
    typeof eventType !== "string" ||
    !ALLOWED_EVENT_TYPES.has(eventType as AnalyticsEvent["eventType"])
  ) {
    return null;
  }

  if (typeof raw.timestamp !== "string" || typeof raw.sessionId !== "string") {
    return null;
  }

  const event: AnalyticsEvent = {
    eventType: eventType as AnalyticsEvent["eventType"],
    timestamp: raw.timestamp,
    sessionId: raw.sessionId.slice(0, 64),
  };

  if (typeof raw.layer === "string") event.layer = raw.layer.slice(0, 32);
  if (typeof raw.severity === "string") event.severity = raw.severity.slice(0, 16);
  if (typeof raw.source === "string") event.source = raw.source.slice(0, 128);
  if (typeof raw.gapCount === "number" && Number.isFinite(raw.gapCount)) {
    event.gapCount = Math.max(0, Math.floor(raw.gapCount));
  }
  if (typeof raw.fixLength === "number" && Number.isFinite(raw.fixLength)) {
    event.fixLength = Math.max(0, Math.floor(raw.fixLength));
  }
  if (
    typeof raw.outcome === "string" &&
    ALLOWED_OUTCOMES.has(raw.outcome as NonNullable<AnalyticsEvent["outcome"]>)
  ) {
    event.outcome = raw.outcome as AnalyticsEvent["outcome"];
  }

  return event;
}

async function readEvents(): Promise<StoredAnalyticsEvent[]> {
  const filePath = getAnalyticsFilePath();
  if (!fs.existsSync(filePath)) return [];

  const content = await readFile(filePath, "utf-8");
  if (!content.trim()) return [];

  try {
    const parsed = JSON.parse(content) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredAnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

async function writeEvents(events: StoredAnalyticsEvent[]): Promise<void> {
  await writeFile(getAnalyticsFilePath(), JSON.stringify(events, null, 2), "utf-8");
}

export async function persistAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  const events = await readEvents();
  const stored: StoredAnalyticsEvent = {
    ...event,
    receivedAt: new Date().toISOString(),
  };

  events.push(stored);

  const trimmed =
    events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;

  await writeEvents(trimmed);
}

export async function getAllAnalyticsEvents(): Promise<StoredAnalyticsEvent[]> {
  return readEvents();
}

export async function getRecentAnalyticsEvents(
  limit = 100
): Promise<{ count: number; events: StoredAnalyticsEvent[] }> {
  const events = await readEvents();
  return {
    count: events.length,
    events: events.slice(-limit),
  };
}

import { isAnalyticsAuthorized } from "@/lib/analytics-auth";

export function isAnalyticsDebugAuthorized(authHeader: string | null): boolean {
  return isAnalyticsAuthorized({ authHeader });
}
