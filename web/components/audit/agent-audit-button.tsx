"use client";

import { Bot, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TooltipWrapper } from "@/components/TooltipWrapper";
import { useAgentAudit } from "@/hooks/useAgentAudit";

export function AgentAuditButton({
  brandName,
  domain,
}: {
  brandName: string;
  domain: string;
}) {
  const { runAgentAudit, isRunning, jobStatus } = useAgentAudit();

  const stageLabel = jobStatus?.stage?.replace(/_/g, " ") ?? "queued";

  return (
    <div className="space-y-3">
      <TooltipWrapper content="Rules-first crawl + score via Agent API (async job)">
        <Button
          type="button"
          onClick={() => void runAgentAudit(brandName, domain)}
          disabled={isRunning}
          className="w-full sm:w-auto"
          variant="default"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running agent audit...
            </>
          ) : (
            <>
              <Bot className="mr-2 h-4 w-4" />
              Run Agent Audit
            </>
          )}
        </Button>
      </TooltipWrapper>

      {isRunning && jobStatus && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="capitalize text-muted-foreground">{jobStatus.status}</span>
            <span className="text-xs text-muted-foreground">{jobStatus.progress}%</span>
          </div>
          <Progress value={jobStatus.progress} className="h-2" />
          <p className="text-xs text-muted-foreground capitalize">{stageLabel}</p>
        </div>
      )}

      {!isRunning && jobStatus?.status === "done" && (
        <p className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="h-3 w-3" />
          Agent audit finished
        </p>
      )}
    </div>
  );
}
