const TIMEOUT_MS = 30_000;

const PLACEHOLDER_KEYS = new Set([
  "your-agent-api-key",
  "your-key-here",
  "changeme",
  "test-key",
]);

const AGENT_API_URL =
  process.env.AGENT_API_URL?.trim() || "http://localhost:8787";
const AGENT_API_KEY = process.env.AGENT_API_KEY?.trim();

export function isAgentAuditConfigured(): boolean {
  if (process.env.AGENT_API_ENABLED !== "true") return false;
  if (!AGENT_API_KEY) return false;
  return !PLACEHOLDER_KEYS.has(AGENT_API_KEY.toLowerCase());
}

export function normalizeSiteUrl(domain: string): string {
  const trimmed = domain.trim();
  if (!trimmed) return "https://example.com";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

async function agentAuditFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  if (!isAgentAuditConfigured()) {
    throw new Error(
      "Agent audit not configured — set AGENT_API_ENABLED=true and AGENT_API_KEY"
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${AGENT_API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Key": AGENT_API_KEY!,
        ...init?.headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function runAgentAuditJob(input: {
  siteUrl: string;
  clientId: string;
  createdBy: string;
}): Promise<{ job_id: string; status: string }> {
  const response = await agentAuditFetch("/agents/audit/run", {
    method: "POST",
    body: JSON.stringify({
      site_url: input.siteUrl,
      client_id: input.clientId,
      created_by: input.createdBy,
    }),
  });

  const data = (await response.json()) as {
    job_id?: string;
    status?: string;
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : `Agent API returned ${response.status}`
    );
  }

  if (!data.job_id) {
    throw new Error("Agent API did not return job_id");
  }

  return { job_id: data.job_id, status: data.status ?? "queued" };
}

export async function getAgentAuditStatus(
  jobId: string
): Promise<{
  job_id: string;
  status: string;
  progress: number;
  stage: string | null;
  error: string | null;
}> {
  const response = await agentAuditFetch(`/agents/audit/status/${jobId}`, {
    method: "GET",
  });

  const data = (await response.json()) as {
    job_id?: string;
    status?: string;
    progress?: number;
    stage?: string | null;
    error?: string | null;
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : `Agent API returned ${response.status}`
    );
  }

  return {
    job_id: data.job_id ?? jobId,
    status: data.status ?? "unknown",
    progress: Number(data.progress ?? 0),
    stage: data.stage ?? null,
    error: data.error ?? null,
  };
}

export async function getAgentAuditResult(jobId: string): Promise<{
  job_id: string;
  status: string;
  audit: Record<string, number>;
  gaps: Array<{
    layer: string;
    issue: string;
    severity: string;
    fix_hint: string;
  }>;
}> {
  const response = await agentAuditFetch(`/agents/audit/result/${jobId}`, {
    method: "GET",
  });

  const data = (await response.json()) as {
    job_id?: string;
    status?: string;
    audit?: Record<string, number>;
    gaps?: Array<{
      layer: string;
      issue: string;
      severity: string;
      fix_hint: string;
    }>;
    detail?: string | { message?: string; error?: string };
  };

  if (!response.ok) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : typeof data.detail === "object" && data.detail
          ? data.detail.error ?? data.detail.message
          : undefined;
    throw new Error(detail ?? `Agent API returned ${response.status}`);
  }

  return {
    job_id: data.job_id ?? jobId,
    status: data.status ?? "done",
    audit: data.audit ?? {},
    gaps: data.gaps ?? [],
  };
}
