import type { Gap } from "@/types/gap";
import type { GapFix } from "@/types";

export type AgentFixStatus = {
  job_id: string;
  status: string;
  progress: number;
  stage: string | null;
  error: string | null;
};

export type AgentFixDraft = {
  layer: string;
  severity: string;
  issue: string;
  action: string;
  contentDraft: string;
  successMetrics: string[];
  resources: string[];
  estimatedEffort: string;
};

export type AgentFixResult = {
  job_id: string;
  status: string;
  fixes: AgentFixDraft[];
};

import { parseApiJson } from "@/lib/parse-api-response";

export function gapToAgentFixInput(gap: Gap): {
  layer: string;
  issue: string;
  severity: string;
  fix_hint: string;
} {
  return {
    layer: gap.layer,
    issue: gap.description || gap.title,
    severity: gap.severity,
    fix_hint: gap.suggestedAction ?? "",
  };
}

export function agentFixDraftToGapFix(draft: AgentFixDraft): GapFix {
  return {
    action: draft.action,
    contentDraft: draft.contentDraft,
    successMetrics: draft.successMetrics,
    resources: draft.resources,
    estimatedEffort: draft.estimatedEffort,
  };
}

export async function startAgentFix(input: {
  domain: string;
  gap?: Gap;
  gaps?: Gap[];
  gapId?: string;
}): Promise<{ job_id: string; status: string }> {
  const gaps = input.gaps ?? (input.gap ? [input.gap] : []);
  if (gaps.length === 0) {
    throw new Error("At least one gap is required");
  }

  const res = await fetch("/api/fix/agent/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domain: input.domain,
      gapId: input.gapId ?? input.gap?.id,
      gaps: gaps.map(gapToAgentFixInput),
    }),
  });
  const data = await parseApiJson<{ job_id?: string; status?: string; error?: string }>(res);
  if (!res.ok || !data.job_id) {
    throw new Error(data.error ?? "Failed to start agent fix job");
  }
  return { job_id: data.job_id, status: data.status ?? "queued" };
}

export async function fetchAgentFixStatus(jobId: string): Promise<AgentFixStatus> {
  const res = await fetch(`/api/fix/agent/status/${encodeURIComponent(jobId)}`);
  const data = await parseApiJson<AgentFixStatus & { error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to fetch fix status");
  }
  return data;
}

export async function fetchAgentFixResult(jobId: string): Promise<AgentFixResult> {
  const res = await fetch(`/api/fix/agent/result/${encodeURIComponent(jobId)}`);
  const data = await parseApiJson<AgentFixResult & { error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to fetch fix result");
  }
  return data;
}

const TERMINAL = new Set(["needs_approval", "done", "failed"]);

export async function pollAgentFix(
  jobId: string,
  onProgress?: (status: AgentFixStatus) => void,
  intervalMs = 2000,
  maxAttempts = 90
): Promise<AgentFixStatus> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await fetchAgentFixStatus(jobId);
    onProgress?.(status);
    if (TERMINAL.has(status.status)) return status;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Fix job timed out — try again later");
}
