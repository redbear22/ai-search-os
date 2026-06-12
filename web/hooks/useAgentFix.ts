"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Gap } from "@/types/gap";
import type { GapFix } from "@/types";
import {
  agentFixDraftToGapFix,
  fetchAgentFixResult,
  pollAgentFix,
  startAgentFix,
  type AgentFixStatus,
} from "@/lib/fix-agent-client";

export function useAgentFix() {
  const [isRunning, setIsRunning] = useState(false);
  const [jobStatus, setJobStatus] = useState<AgentFixStatus | null>(null);

  const runAgentFix = useCallback(
    async (domain: string, gap: Gap): Promise<GapFix | null> => {
      const trimmedDomain = domain.trim();
      if (!trimmedDomain) {
        toast.error("Domain is required");
        return null;
      }

      setIsRunning(true);
      setJobStatus(null);

      try {
        const { job_id } = await startAgentFix({
          domain: trimmedDomain,
          gap,
          gapId: gap.id,
        });
        const finalStatus = await pollAgentFix(job_id, setJobStatus);

        if (finalStatus.status === "failed") {
          toast.error(finalStatus.error ?? "Fix agent failed");
          return null;
        }

        const result = await fetchAgentFixResult(job_id);
        const draft = result.fixes[0];
        if (!draft) {
          toast.error("Fix agent returned no drafts");
          return null;
        }

        toast.success("Fix draft ready for approval");
        return agentFixDraftToGapFix(draft);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Agent fix failed";
        if (message.includes("not configured")) {
          toast.error("Agent fix unavailable — enable AGENT_API on the server");
        } else if (message.includes("Unauthorized") || message.includes("401")) {
          toast.error("Sign in to run cloud fix jobs");
        } else {
          toast.error(message);
        }
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    []
  );

  return { runAgentFix, isRunning, jobStatus };
}
