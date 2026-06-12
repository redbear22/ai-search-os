"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bot,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAuditUrl } from "@/lib/audit-navigation";

type ClientSummary = {
  id: string;
  name: string;
  domain: string | null;
};

type AgencyGap = {
  id: string;
  title: string;
  layer: string;
  severity: string;
  description: string | null;
  suggestedOwner: string | null;
};

type AutonomousRun = {
  id: string;
  status: string;
  triggerType: string;
  gapsDetected: number;
  startedAt: string;
  completedAt: string | null;
};

const severityVariant = (severity: string): "destructive" | "default" | "secondary" => {
  if (severity === "critical" || severity === "high") return "destructive";
  if (severity === "medium") return "default";
  return "secondary";
};

export default function ClientAuditPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId ?? "";
  const router = useRouter();
  const [client, setClient] = useState<ClientSummary | null>(null);
  const [gaps, setGaps] = useState<AgencyGap[]>([]);
  const [recentRuns, setRecentRuns] = useState<AutonomousRun[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientRes, gapsRes, auditRes] = await Promise.all([
        fetch(`/api/agency/clients/${clientId}`),
        fetch(`/api/agency/clients/${clientId}/gaps`),
        fetch(`/api/agency/clients/${clientId}/autonomous-audit`),
      ]);

      if (clientRes.ok) {
        const data = (await clientRes.json()) as ClientSummary;
        setClient(data);
      }

      if (gapsRes.ok) {
        const data = (await gapsRes.json()) as { gaps: AgencyGap[] };
        setGaps(data.gaps ?? []);
      }

      if (auditRes.ok) {
        const data = (await auditRes.json()) as { recentRuns?: AutonomousRun[] };
        setRecentRuns(data.recentRuns ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="container mx-auto flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto py-16 text-center text-muted-foreground">
        Client not found
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{client.name} — Audit</h1>
          <p className="text-muted-foreground">
            {client.domain || "Domain not set"} · Run audits and review open gaps
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() =>
              router.push(
                buildAuditUrl({
                  clientId,
                  domain: client.domain,
                  brandName: client.name,
                })
              )
            }
          >
            <Play className="mr-2 h-4 w-4" />
            Run Audit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Link href={`/agency/clients/${clientId}/autonomous`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-5 w-5 text-blue-600" />
                Autonomous Audits
              </CardTitle>
              <CardDescription>Schedule and monitor automated audit runs</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">
                Configure <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/agency/clients/${clientId}/fixes`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Fix Pipeline
              </CardTitle>
              <CardDescription>Generate and apply fixes for detected gaps</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">
                View fixes <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/agency/clients/${clientId}/roi`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                ROI Forecast
              </CardTitle>
              <CardDescription>Opportunity analysis from audit gaps</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">
                View ROI <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open Gaps</CardTitle>
          <CardDescription>
            {gaps.length === 0
              ? "No open gaps — run an audit to detect visibility opportunities"
              : `${gaps.length} gap${gaps.length === 1 ? "" : "s"} ranked by severity`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gaps.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <AlertTriangle className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p>Run an audit to populate gap detection for this client.</p>
              <Button
                className="mt-4"
                onClick={() =>
                  router.push(
                    buildAuditUrl({
                      clientId,
                      domain: client.domain,
                      brandName: client.name,
                    })
                  )
                }
              >
                Run Audit
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {gaps.map((gap) => (
                <div
                  key={gap.id}
                  className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant={severityVariant(gap.severity)}>{gap.severity}</Badge>
                      <Badge variant="outline">{gap.layer}</Badge>
                    </div>
                    <p className="font-medium">{gap.title}</p>
                    {gap.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{gap.description}</p>
                    )}
                  </div>
                  {gap.suggestedOwner && (
                    <p className="text-xs text-muted-foreground sm:text-right">
                      Owner: {gap.suggestedOwner}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {recentRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Autonomous Runs</CardTitle>
            <CardDescription>Latest scheduled or triggered audit executions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRuns.slice(0, 5).map((run) => (
                <div
                  key={run.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(run.startedAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {run.triggerType} · {run.gapsDetected} gaps detected
                    </p>
                  </div>
                  <Badge variant={run.status === "completed" ? "default" : "secondary"}>
                    {run.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
