import type { ContentPayload, OutreachTask } from "@/lib/citation-engine-client";

const TIMEOUT_MS = 5000;

const PLACEHOLDER_KEYS = new Set([
  "your-agent-api-key",
  "your-key-here",
  "changeme",
  "test-key",
]);

const CITATION_ENGINE_URL =
  process.env.CITATION_ENGINE_URL?.trim() || "http://localhost:8510";
const AGENT_API_URL =
  process.env.AGENT_API_URL?.trim() || "http://localhost:8787";
const AGENT_API_KEY = process.env.AGENT_API_KEY?.trim();

function isAgentApiEnabled(): boolean {
  return process.env.AGENT_API_ENABLED === "true";
}

function isCitationEngineEnabled(): boolean {
  return process.env.CITATION_ENGINE_ENABLED === "true";
}

function hasValidAgentApiKey(): boolean {
  if (!AGENT_API_KEY) return false;
  return !PLACEHOLDER_KEYS.has(AGENT_API_KEY.toLowerCase());
}

function isAgentApiConfigured(): boolean {
  return isAgentApiEnabled() && hasValidAgentApiKey();
}

function isCitationEngineConfigured(): boolean {
  return isCitationEngineEnabled();
}

export function getCitationPushConfig() {
  return {
    agentApiEnabled: isAgentApiConfigured(),
    citationEngineEnabled: isCitationEngineConfigured(),
    pushAvailable: isAgentApiConfigured() || isCitationEngineConfigured(),
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function pushToAgentApi(payload: ContentPayload): Promise<Response | null> {
  if (!isAgentApiConfigured()) return null;

  return fetchWithTimeout(`${AGENT_API_URL}/jobs/content/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": AGENT_API_KEY!,
    },
    body: JSON.stringify(payload),
  });
}

async function pushToCitationEngineWebhook(
  payload: ContentPayload
): Promise<Response | null> {
  if (!isCitationEngineConfigured()) return null;

  return fetchWithTimeout(`${CITATION_ENGINE_URL}/api/content/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function pushContentServer(payload: ContentPayload): Promise<unknown> {
  if (!isAgentApiConfigured() && !isCitationEngineConfigured()) {
    throw new Error(
      "Citation push disabled — set CITATION_ENGINE_ENABLED=true and/or AGENT_API_ENABLED=true when services are running"
    );
  }

  try {
    const agentResponse = await pushToAgentApi(payload);
    if (agentResponse?.ok) {
      return { ...(await agentResponse.json()), source: "agent_api" };
    }
  } catch {
    // fall through to Citation Engine
  }

  try {
    const ceResponse = await pushToCitationEngineWebhook(payload);
    if (ceResponse?.ok) {
      return { ...(await ceResponse.json()), source: "citation_engine" };
    }
  } catch {
    // caller handles unavailable state
  }

  throw new Error("Agent API and Citation Engine unavailable");
}

export async function createOutreachTaskServer(task: OutreachTask): Promise<unknown> {
  if (!isAgentApiConfigured()) {
    throw new Error(
      "Agent API not configured — set AGENT_API_ENABLED=true and AGENT_API_KEY when the service is running"
    );
  }

  const response = await fetchWithTimeout(`${AGENT_API_URL}/jobs/outreach/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": AGENT_API_KEY!,
    },
    body: JSON.stringify(task),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Agent API returned ${response.status}`);
  }

  return response.json();
}
