"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { FixPipelineRunView, PipelineStepState } from "@/types/automated-fix-pipeline";

const PIPELINE_LABELS: Record<string, string> = {
  citation_outreach: "Citation outreach",
  content_generation: "Content generation",
  entity_optimization: "Entity optimization",
};

function stepBadge(status: PipelineStepState["status"]) {
  if (status === "completed") return <Badge variant="secondary">Done</Badge>;
  if (status === "awaiting_approval") return <Badge>Review</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (status === "running") return <Badge variant="outline">Running</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

type ClientGap = {
  id: string;
  title: string;
  layer: string;
  severity: string;
};

export default function AutomatedFixPipelinePage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId ?? "";
  const { toast } = useToast();

  const [runs, setRuns] = useState<FixPipelineRunView[]>([]);
  const [gaps, setGaps] = useState<ClientGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingGapId, setStartingGapId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [runsRes, gapsRes] = await Promise.all([
      fetch(`/api/agency/clients/${clientId}/fixes/pipeline`),
      fetch(`/api/agency/clients/${clientId}/gaps`),
    ]);

    if (runsRes.ok) {
      const data = (await runsRes.json()) as { runs: FixPipelineRunView[] };
      setRuns(data.runs);
    }

    if (gapsRes.ok) {
      const data = (await gapsRes.json()) as { gaps: ClientGap[] };
      setGaps(data.gaps);
    }

    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const startPipeline = async (gapId: string) => {
    setStartingGapId(gapId);
    const res = await fetch(`/api/agency/clients/${clientId}/fixes/pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gapId, autoSend: false }),
    });
    setStartingGapId(null);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast({ title: data.error ?? "Pipeline failed", variant: "destructive" });
      return;
    }

    const data = (await res.json()) as { requiresApproval: boolean; pipelineType: string };
    toast({
      title: data.requiresApproval ? "Pipeline awaiting approval" : "Pipeline started",
      description: PIPELINE_LABELS[data.pipelineType],
    });
    void load();
  };

  const approveRun = async (runId: string) => {
    const res = await fetch(
      `/api/agency/clients/${clientId}/fixes/pipeline/${runId}/approve`,
      { method: "POST" }
    );
    if (!res.ok) {
      toast({ title: "Approval failed", variant: "destructive" });
      return;
    }
    toast({ title: "Approved — pipeline continuing" });
    void load();
  };

  return (
    <div className="container mx-auto space-y-6 py-8">
      <Link
        href={`/agency/clients/${clientId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to client
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Wrench className="h-8 w-8" />
          Automated Fix Pipeline
        </h1>
        <p className="text-muted-foreground">
          Rules-first automation with optional AI enhancement and human approval before send/publish
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(
          [
            ["Citation outreach", "Research → Draft → Send → Track → 5-day follow-up"],
            ["Content generation", "Brief → Draft → SEO → Review → CMS publish"],
            ["Entity optimization", "JSON-LD → Staging → Validate → Production"],
          ] as const
        ).map(([title, desc]) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{desc}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open gaps — start pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          {gaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open gaps in the database. Run an autonomous audit or complete a manual audit first.
            </p>
          ) : (
            <div className="space-y-2">
              {gaps.map((gap) => (
                <div
                  key={gap.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{gap.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {gap.layer} · {gap.severity}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={startingGapId === gap.id}
                    onClick={() => void startPipeline(gap.id)}
                  >
                    {startingGapId === gap.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Automate fix
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline runs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pipeline runs yet.</p>
          ) : (
            <div className="space-y-4">
              {runs.map((run) => (
                <div key={run.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {PIPELINE_LABELS[run.pipelineType] ?? run.pipelineType}
                      </span>
                      <Badge variant="outline">{run.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {new Date(run.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {run.requiresApproval && !run.approvedAt ? (
                      <Button size="sm" onClick={() => void approveRun(run.id)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve & continue
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(run.steps as PipelineStepState[]).map((step) => (
                      <div
                        key={step.step}
                        className="flex items-center gap-1 rounded border px-2 py-1 text-xs"
                      >
                        <span className="capitalize">{step.step.replace(/_/g, " ")}</span>
                        {stepBadge(step.status)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
