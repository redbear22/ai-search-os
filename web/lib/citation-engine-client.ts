import { toastApiError } from "@/lib/api-error";

export type ContentPayloadType = "pitch" | "article" | "positioning" | "review_response";

export interface ContentPayload {
  type: ContentPayloadType;
  title: string;
  body: string;
  targetUrl?: string;
  sourceGapId?: string;
  metadata: Record<string, unknown>;
}

export interface OutreachTask {
  publication: string;
  pitch: string;
  contactEmail?: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
}

export interface QueuedCitationItem extends ContentPayload {
  queuedAt: string;
}

export interface QueuedOutreachTask extends OutreachTask {
  queuedAt: string;
}

export const PENDING_QUEUE_KEY = "pending_citation_queue";
const PENDING_OUTREACH_KEY = "pending_outreach_tasks";
export const CITATION_QUEUE_CHANGED = "citation-queue-changed";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJsonArray<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(key: string, value: T[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
  if (key === PENDING_QUEUE_KEY) {
    window.dispatchEvent(new Event(CITATION_QUEUE_CHANGED));
  }
}

export function getPendingCitationQueueCount(): number {
  return readJsonArray<QueuedCitationItem>(PENDING_QUEUE_KEY).length;
}

function queueCitationPayload(payload: ContentPayload): { queued: true; message: string } {
  const pendingQueue = readJsonArray<QueuedCitationItem>(PENDING_QUEUE_KEY);
  pendingQueue.push({ ...payload, queuedAt: new Date().toISOString() });
  writeJsonArray(PENDING_QUEUE_KEY, pendingQueue);
  console.log("📦 Content queued for later sync");
  return { queued: true, message: "Content queued - API unavailable" };
}

function queueOutreachTask(task: OutreachTask): { queued: true } {
  const pendingTasks = readJsonArray<QueuedOutreachTask>(PENDING_OUTREACH_KEY);
  pendingTasks.push({ ...task, queuedAt: new Date().toISOString() });
  writeJsonArray(PENDING_OUTREACH_KEY, pendingTasks);
  console.warn("Agent API not configured - outreach task saved locally");
  return { queued: true };
}

export async function pushToCitationEngine(
  payload: ContentPayload
): Promise<unknown> {
  try {
    const response = await fetch("/api/citation-engine/push-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log("✅ Content pushed to Citation Engine / Agent API");
      return response.json();
    }
  } catch {
    console.warn("Citation push API unavailable, queuing locally");
  }

  return queueCitationPayload(payload);
}

export async function createOutreachTask(task: OutreachTask): Promise<unknown> {
  try {
    const response = await fetch("/api/citation-engine/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });

    if (response.ok) {
      return response.json();
    }
  } catch {
    console.warn("Outreach API unavailable, queuing locally");
  }

  return queueOutreachTask(task);
}

export async function syncPendingQueue(): Promise<void> {
  if (!isBrowser()) return;

  const pendingQueue = readJsonArray<QueuedCitationItem>(PENDING_QUEUE_KEY);
  if (pendingQueue.length === 0) return;

  console.log(`🔄 Syncing ${pendingQueue.length} pending items...`);

  const remaining: QueuedCitationItem[] = [];

  for (const item of pendingQueue) {
    const { queuedAt: _queuedAt, ...payload } = item;
    try {
      const response = await fetch("/api/citation-engine/push-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
      toastApiError();
    }
  }

  writeJsonArray(PENDING_QUEUE_KEY, remaining);
}

export async function syncPendingOutreachTasks(): Promise<void> {
  if (!isBrowser()) return;

  const pendingTasks = readJsonArray<QueuedOutreachTask>(PENDING_OUTREACH_KEY);
  if (pendingTasks.length === 0) return;

  const remaining: QueuedOutreachTask[] = [];

  for (const task of pendingTasks) {
    const { queuedAt: _queuedAt, ...outreachTask } = task;
    try {
      const response = await fetch("/api/citation-engine/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(outreachTask),
      });
      if (!response.ok) {
        remaining.push(task);
      }
    } catch {
      remaining.push(task);
    }
  }

  writeJsonArray(PENDING_OUTREACH_KEY, remaining);
}

/** Build a content payload from a generated gap fix. */
export function gapFixToContentPayload(input: {
  gapId: string;
  gapTitle: string;
  gapLayer: string;
  gapSource: string;
  contentDraft: string;
  action: string;
  targetUrl?: string;
}): ContentPayload {
  const hasPitch =
    input.contentDraft.trim().length > 0 &&
    (input.contentDraft.toLowerCase().includes("dear ") ||
      input.contentDraft.toLowerCase().includes("subject:"));

  return {
    type: hasPitch ? "pitch" : "positioning",
    title: input.gapTitle,
    body: input.contentDraft.trim() || input.action,
    targetUrl: input.targetUrl,
    sourceGapId: input.gapId,
    metadata: {
      layer: input.gapLayer,
      source: input.gapSource,
      action: input.action,
    },
  };
}
