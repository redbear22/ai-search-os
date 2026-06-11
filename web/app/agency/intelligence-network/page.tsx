"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Database,
  Loader2,
  Network,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { NetworkInsightsCards } from "@/components/intelligence-network/NetworkInsightsCards";
import type { CompetitiveIntelligenceNetwork } from "@/types/competitive-intelligence-network";

export default function IntelligenceNetworkPage() {
  const [data, setData] = useState<CompetitiveIntelligenceNetwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/agency/intelligence-network");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed to load intelligence network");
      setData(null);
      setLoading(false);
      return;
    }
    setData((await res.json()) as CompetitiveIntelligenceNetwork);
    setLoading(false);
  }, []);

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

  if (error || !data) {
    return (
      <div className="container mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-bold">Competitive Intelligence Network</h1>
        <p className="mt-2 text-muted-foreground">{error ?? "Unavailable"}</p>
        <Button className="mt-4" variant="outline" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-8">
      <Link
        href="/agency"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to agency dashboard
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Network className="h-8 w-8" />
            Competitive Intelligence Network
          </h1>
          <p className="text-muted-foreground">
            Anonymized benchmarks across your client portfolio — exclusive to agency clients
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Network strength</p>
            <p className="text-2xl font-bold">{data.networkEffects.networkStrength}%</p>
            <Progress value={data.networkEffects.networkStrength} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Clients contributing</p>
            <p className="text-2xl font-bold">{data.networkEffects.clientCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Audits in network</p>
            <p className="text-2xl font-bold">{data.networkEffects.auditCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Fix patterns learned</p>
            <p className="text-2xl font-bold">{data.networkEffects.learningRecordCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Network effects flywheel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {data.networkEffects.flywheel.map((step, i) => (
              <div key={step.step} className="flex items-center gap-2">
                <div className="rounded-lg border px-3 py-2 text-sm">
                  <p className="font-medium">{step.step}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {i < data.networkEffects.flywheel.length - 1 ? (
                  <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Network insights</h2>
        <NetworkInsightsCards insights={data.insights} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Data sources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.dataSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{source.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {source.recordCount} records
                  </p>
                </div>
                <Badge
                  variant={
                    source.status === "active"
                      ? "default"
                      : source.status === "sparse"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {source.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Citation platforms (public)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.citationPlatforms.map((platform) => (
              <div
                key={platform.platform}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{platform.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(platform.brandMentionRate * 100)}% mention rate ·{" "}
                    {platform.avgAuthorityScore}% authority
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {platform.trend}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {data.publicationPatterns.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publication authority multipliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.publicationPatterns.slice(0, 9).map((pub) => (
                <div
                  key={pub.publication}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span>{pub.publication}</span>
                  <Badge>{pub.authorityMultiplier}x</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data.competitorSignals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Competitor change signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.competitorSignals.map((signal, i) => (
              <div key={i} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {signal.signalType.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant={
                      signal.severity === "high"
                        ? "destructive"
                        : signal.severity === "medium"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {signal.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground capitalize">
                    {signal.industry}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{signal.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Computed {new Date(data.computedAt).toLocaleString()} · rules-first · no PII exposed
      </p>
    </div>
  );
}
