"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  fetchAgentAuditResult,
  pollAgentAudit,
  startAgentAudit,
  type AgentAuditStatus,
} from "@/lib/audit-agent-client";
import {
  agentGapToUiGap,
  agentScoresToAuditData,
} from "@/lib/workflow-mappers";
import { persistGaps, saveAudit } from "@/lib/workflow-api";
import {
  getWorkflowAuditDbId,
  setWorkflowAuditDbId,
} from "@/hooks/useWorkflowDb";
import { useAuditStore } from "@/store/auditStore";

export function useAgentAudit() {
  const { status: authStatus } = useSession();
  const applyUnifiedAudit = useAuditStore((s) => s.applyUnifiedAudit);
  const [isRunning, setIsRunning] = useState(false);
  const [jobStatus, setJobStatus] = useState<AgentAuditStatus | null>(null);

  const runAgentAudit = useCallback(
    async (brandName: string, domain: string) => {
      const trimmedDomain = domain.trim();
      const trimmedBrand = brandName.trim() || trimmedDomain;
      if (!trimmedDomain) {
        toast.error("Domain is required");
        return null;
      }

      setIsRunning(true);
      setJobStatus(null);

      try {
        const { job_id } = await startAgentAudit(trimmedDomain);
        const finalStatus = await pollAgentAudit(job_id, setJobStatus);

        if (finalStatus.status === "failed") {
          toast.error(finalStatus.error ?? "Audit agent failed");
          return null;
        }

        const result = await fetchAgentAuditResult(job_id);
        const auditData = agentScoresToAuditData(result.audit);
        applyUnifiedAudit(auditData, trimmedBrand, trimmedDomain);

        const uiGaps = result.gaps.map((gap, index) =>
          agentGapToUiGap(gap, trimmedDomain, index)
        );

        if (authStatus === "authenticated") {
          const savedAudit = await saveAudit({
            id: getWorkflowAuditDbId(),
            brandName: trimmedBrand,
            domain: trimmedDomain,
            auditData,
            isCompleted: false,
            completedAt: null,
            gapCount: uiGaps.length,
          });
          setWorkflowAuditDbId(savedAudit.id);

          if (uiGaps.length > 0) {
            await persistGaps({
              auditId: savedAudit.id,
              gaps: uiGaps,
              replace: true,
            });
          }
        }

        toast.success(
          uiGaps.length > 0
            ? `Agent audit complete — ${uiGaps.length} gap${uiGaps.length === 1 ? "" : "s"} found`
            : "Agent audit complete — no gaps detected"
        );
        return { jobId: job_id, gapCount: uiGaps.length };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Agent audit failed";
        if (message.includes("not configured")) {
          toast.error("Agent audit unavailable — enable AGENT_API on the server");
        } else if (message.includes("Unauthorized") || message.includes("401")) {
          toast.error("Sign in to run cloud agent audits");
        } else {
          toast.error(message);
        }
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    [applyUnifiedAudit, authStatus]
  );

  return { runAgentAudit, isRunning, jobStatus };
}
