/** Agent API is optional — not deployed in this project. Defaults to mock responses. */
const AGENT_API_ENABLED = process.env.AGENT_API_ENABLED === "true";
const AGENT_API_URL = process.env.AGENT_API_URL || "http://localhost:8787";
const AGENT_API_KEY = process.env.AGENT_API_KEY || "test-key";
const TIMEOUT_MS = 5000;

export const mockAuditData = {
  discoverability: { traffic: 150000, keywords: 8500, aiVisibilityScore: 72 },
  authority: { backlinks: 3400, citingSources: ["techcrunch.com", "wired.com"] },
};

export interface JobCreatedResponse {
  job_id: number | string;
  graph_name: string;
  status: string;
  mock?: boolean;
  error?: string;
}

export interface JobStatusResponse {
  id?: number;
  job_id?: number | string;
  graph_name?: string;
  status?: string;
  output_json?: string;
  error?: string;
  mock?: boolean;
}

export interface ResearchJobResponse extends JobCreatedResponse {
  keyword?: string;
}

function apiHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-API-Key": AGENT_API_KEY,
  };
}

function normalizeDomain(domain: string): string {
  const trimmed = domain.trim();
  if (!trimmed) return "https://example.com";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

async function agentFetch(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${AGENT_API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...apiHeaders(),
        ...init?.headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function checkAgentApiHealth(): Promise<boolean> {
  try {
    const res = await agentFetch("/health", { method: "GET", headers: { "X-API-Key": AGENT_API_KEY } });
    return res.ok;
  } catch {
    return false;
  }
}

export async function triggerAuditJob(
  domain: string,
  layers: string[]
): Promise<JobCreatedResponse> {
  if (!AGENT_API_ENABLED) {
    return {
      job_id: "mock-audit",
      graph_name: "audit_site",
      status: "completed",
      mock: true,
      error: "Agent API disabled — using mock data",
    };
  }

  try {
    const response = await agentFetch("/jobs/audit", {
      method: "POST",
      body: JSON.stringify({
        target_url: normalizeDomain(domain),
        site_url: normalizeDomain(domain),
        keyword: layers.length ? layers.join(", ") : "audit",
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Agent API returned ${response.status}`);
    }

    const data = await parseJson<JobCreatedResponse>(response);
    return { ...data, mock: false };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Agent API timed out after 5s"
          : err.message
        : "Agent API unavailable";
    return {
      job_id: "mock-audit",
      graph_name: "audit_site",
      status: "completed",
      mock: true,
      error: `${message} — using mock data`,
    };
  }
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  if (jobId === "mock-audit") {
    return {
      job_id: "mock-audit",
      graph_name: "audit_site",
      status: "completed",
      output_json: JSON.stringify(mockAuditData),
      mock: true,
    };
  }

  try {
    const response = await agentFetch(`/jobs/${jobId}`, {
      method: "GET",
      headers: { "X-API-Key": AGENT_API_KEY },
    });

    if (!response.ok) {
      throw new Error(`Agent API returned ${response.status}`);
    }

    const data = await parseJson<JobStatusResponse>(response);
    return { ...data, mock: false };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Agent API timed out after 5s"
          : err.message
        : "Agent API unavailable";
    return {
      job_id: jobId,
      status: "completed",
      output_json: JSON.stringify(mockAuditData),
      mock: true,
      error: `${message} — using mock data`,
    };
  }
}

export async function getResearchData(topic: string): Promise<ResearchJobResponse> {
  if (!AGENT_API_ENABLED) {
    return {
      job_id: "mock-research",
      graph_name: "research_keyword",
      status: "completed",
      keyword: topic,
      mock: true,
      error: "Agent API disabled — using mock data",
    };
  }

  try {
    const response = await agentFetch("/jobs/research", {
      method: "POST",
      body: JSON.stringify({ keyword: topic, category: "General" }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Agent API returned ${response.status}`);
    }

    const data = await parseJson<ResearchJobResponse>(response);
    return { ...data, keyword: topic, mock: false };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Agent API timed out after 5s"
          : err.message
        : "Agent API unavailable";
    return {
      job_id: "mock-research",
      graph_name: "research_keyword",
      status: "completed",
      keyword: topic,
      mock: true,
      error: `${message} — using mock data`,
    };
  }
}
