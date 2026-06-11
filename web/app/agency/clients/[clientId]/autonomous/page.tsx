"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Bot,
  Calendar,
  Loader2,
  Play,
  Webhook,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { canManageClients } from "@/lib/agency-rbac";
import type {
  AuditFrequency,
  AutonomousAuditConfigView,
  AutonomousAuditRunSummary,
} from "@/types/autonomous-audit";

const TRIGGER_LABELS: Record<string, string> = {
  schedule: "Scheduled",
  citation_spike: "Citation spike",
  platform_release: "AI platform release",
  domain_change: "Domain change",
  webhook: "Webhook",
};

export default function AutonomousAuditPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId ?? "";
  const { data: session } = useSession();
  const { toast } = useToast();
  const canManage = session?.user?.agencyRole
    ? canManageClients(session.user.agencyRole)
    : false;

  const [config, setConfig] = useState<AutonomousAuditConfigView | null>(null);
  const [runs, setRuns] = useState<AutonomousAuditRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/agency/clients/${clientId}/autonomous-audit`);
    if (res.ok) {
      const data = (await res.json()) as {
        config: AutonomousAuditConfigView;
        recentRuns: AutonomousAuditRunSummary[];
      };
      setConfig(data.config);
      setRuns(data.recentRuns);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveConfig = async (patch: Partial<AutonomousAuditConfigView>) => {
    if (!config) return;
    setSaving(true);
    const res = await fetch(`/api/agency/clients/${clientId}/autonomous-audit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: patch.enabled ?? config.enabled,
        auditFrequency: patch.auditFrequency ?? config.auditFrequency,
        triggers: patch.triggers ?? config.triggers,
        autoAssign: patch.autoAssign ?? config.autoAssign,
        notifyClient: patch.notifyClient ?? config.notifyClient,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ title: "Failed to save", variant: "destructive" });
      return;
    }
    toast({ title: "Autonomous audit settings saved" });
    void load();
  };

  const runNow = async () => {
    setRunning(true);
    const res = await fetch(`/api/agency/clients/${clientId}/autonomous-audit/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggerType: "webhook" }),
    });
    setRunning(false);
    if (!res.ok) {
      toast({ title: "Audit run failed", variant: "destructive" });
      return;
    }
    toast({ title: "Autonomous audit completed" });
    void load();
  };

  if (loading) {
    return (
      <div className="container mx-auto flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="container mx-auto py-16 text-center text-muted-foreground">
        Autonomous audit unavailable
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-8">
      <Link
        href={`/agency/clients/${clientId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to client
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Bot className="h-8 w-8" />
            Autonomous Audit Engine
          </h1>
          <p className="text-muted-foreground">
            Rules-based scheduling, gap detection, prioritization, and team assignment
          </p>
        </div>
        <Button onClick={runNow} disabled={running}>
          {running ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Run now
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="enabled"
                checked={config.enabled}
                disabled={!canManage || saving}
                onCheckedChange={(checked) =>
                  void saveConfig({ enabled: checked === true })
                }
              />
              <Label htmlFor="enabled">Enable autonomous audits</Label>
            </div>

            <div className="space-y-2">
              <Label>Audit frequency</Label>
              <Select
                value={config.optimizedFrequency ?? config.auditFrequency}
                disabled={!canManage}
                onValueChange={(v) =>
                  void saveConfig({ auditFrequency: v as AuditFrequency })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              {config.optimizedFrequency ? (
                <p className="text-xs text-muted-foreground">
                  Optimized frequency: {config.optimizedFrequency} (learned from gap velocity)
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Event triggers</Label>
              {(
                [
                  ["citationSpike", "Competitor citation spike"],
                  ["platformRelease", "New AI platform release"],
                  ["domainChange", "Client domain changes"],
                  ["webhook", "Agency API webhook"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={config.triggers[key]}
                    disabled={!canManage}
                    onCheckedChange={(checked) =>
                      void saveConfig({
                        triggers: { ...config.triggers, [key]: checked === true },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={config.autoAssign}
                disabled={!canManage}
                onCheckedChange={(checked) =>
                  void saveConfig({ autoAssign: checked === true })
                }
              />
              <Label className="font-normal">Auto-assign gaps to team members</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={config.notifyClient}
                disabled={!canManage}
                onCheckedChange={(checked) =>
                  void saveConfig({ notifyClient: checked === true })
                }
              />
              <Label className="font-normal">Notify client when portal sharing is enabled</Label>
            </div>

            {config.webhookUrl ? (
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Webhook className="h-3 w-3" />
                  Webhook URL
                </div>
                <code className="block break-all text-xs">{config.webhookUrl}</code>
              </div>
            ) : null}

            {config.nextAuditAt ? (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Next scheduled: {new Date(config.nextAuditAt).toLocaleString()}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              The engine learns which fix patterns succeed, predicts high-impact gaps, and
              adjusts audit frequency per client automatically.
            </p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>Runs full 4-platform audit via unified data client</li>
              <li>Detects and prioritizes gaps by business impact</li>
              <li>Assigns action plans to least-loaded team member</li>
              <li>Records fix outcomes to improve future prioritization</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No autonomous runs yet.</p>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {TRIGGER_LABELS[run.triggerType] ?? run.triggerType}
                      </Badge>
                      <Badge
                        variant={run.status === "completed" ? "secondary" : "destructive"}
                      >
                        {run.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {run.gapsDetected} gaps detected · {run.gapsAssigned} assigned
                      {run.notifiedClient ? " · client notified" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString()}
                    </p>
                  </div>
                  {run.intelligence &&
                  typeof run.intelligence === "object" &&
                  "topPredictedGaps" in (run.intelligence as object) ? (
                    <div className="text-xs text-muted-foreground">
                      Predicted:{" "}
                      {(
                        (run.intelligence as { topPredictedGaps?: string[] }).topPredictedGaps ??
                        []
                      )
                        .slice(0, 2)
                        .join(", ") || "—"}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
