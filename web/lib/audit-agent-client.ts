import type { Gap } from "@/types/gap";

export type AgentAuditStatus = {
  job_id: string;
  status: string;
  progress: number;
  stage: string | null;
  error: string | null;
};

export type AgentAuditResult = {
  job_id: string;
  status: string;
  audit: Record<string, number>;
  gaps: Array<{
    layer: string;
    issue: string;
    severity: string;
    fix_hint: string;
  }>;
};

import { parseApiJson } from "@/lib/parse-api-response";

export async function startAgentAudit(domain: string): Promise<{ job_id: string; status: string }> {
  const res = await fetch("/api/audit/agent/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain }),
  });
  const data = await parseApiJson<{ job_id?: string; status?: string; error?: string }>(res);
  if (!res.ok || !data.job_id) {
    throw new Error(data.error ?? "Failed to start agent audit");
  }
  return { job_id: data.job_id, status: data.status ?? "queued" };
}

export async function fetchAgentAuditStatus(jobId: string): Promise<AgentAuditStatus> {
  const res = await fetch(`/api/audit/agent/status/${encodeURIComponent(jobId)}`);
  const data = await parseApiJson<AgentAuditStatus & { error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to fetch audit status");
  }
  return data;
}

export async function fetchAgentAuditResult(jobId: string): Promise<AgentAuditResult> {
  const res = await fetch(`/api/audit/agent/result/${encodeURIComponent(jobId)}`);
  const data = await parseApiJson<AgentAuditResult & { error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to fetch audit result");
  }
  return data;
}

const TERMINAL = new Set(["done", "failed"]);

export async function pollAgentAudit(
  jobId: string,
  onProgress?: (status: AgentAuditStatus) => void,
  intervalMs = 2000,
  maxAttempts = 150
): Promise<AgentAuditStatus> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await fetchAgentAuditStatus(jobId);
    onProgress?.(status);
    if (TERMINAL.has(status.status)) return status;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Audit timed out — try again later");
}

export function agentGapsToUiGaps(
  agentGaps: AgentAuditResult["gaps"],
  domain: string
): Gap[] {
  return agentGaps.map((gap, index) => ({
    id: `agent-gap-${index}`,
    layer: gap.layer as Gap["layer"],
    title: `${gap.layer.charAt(0).toUpperCase()}${gap.layer.slice(1)} gap`,
    description: gap.issue,
    severity: (gap.severity as Gap["severity"]) || "medium",
    source: domain,
    suggestedAction: gap.fix_hint,
    suggestedOwner: "SEO",
    suggestedTimeline: 4,
  }));
}
