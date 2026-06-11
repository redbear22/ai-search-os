"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  DollarSign,
  Clock,
  Heart,
  Loader2,
  Minus,
  Target,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ClientVsNetworkSection } from "@/components/intelligence-network/ClientVsNetworkSection";
import type { ClientHealthDashboard } from "@/types/client-health";

function TrendIcon({ direction }: { direction: ClientHealthDashboard["trendDirection"] }) {
  if (direction === "up") return <ArrowUp className="h-4 w-4 text-green-600" />;
  if (direction === "down") return <ArrowDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function healthColor(score: number): string {
  if (score >= 75) return "text-green-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export default function ClientHealthPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [data, setData] = useState<ClientHealthDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/agency/clients/${clientId}/health`);
    if (res.ok) {
      setData((await res.json()) as ClientHealthDashboard);
    }
    setLoading(false);
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

  if (!data) {
    return (
      <div className="container mx-auto py-16 text-center text-muted-foreground">
        Health dashboard unavailable
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{data.clientName}</h1>
          <p className="text-muted-foreground">Client health dashboard with predictive analytics</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Updated {new Date(data.lastUpdated).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2">
          <CardContent className="flex items-center gap-6 pt-6">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full border-4 text-2xl font-bold ${healthColor(data.healthScore)}`}
              style={{ borderColor: "currentColor" }}
            >
              {data.healthScore}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Composite health score</p>
              <div className="mt-1 flex items-center gap-2">
                <TrendIcon direction={data.trendDirection} />
                <span className="capitalize">{data.trendDirection} trend</span>
              </div>
              <Progress value={data.healthScore} className="mt-3 h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Market rank
            </div>
            <p className="mt-2 text-3xl font-bold">#{data.competitorBenchmarking.clientRank}</p>
            <p className="text-xs text-muted-foreground">
              {data.competitorBenchmarking.marketShare}% share of voice
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" />
              Satisfaction
            </div>
            <p className="mt-2 text-3xl font-bold">
              {data.agencyMetrics.clientSatisfaction}%
            </p>
            <p className="text-xs text-muted-foreground">Predicted from improvements</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Layer scores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(
              [
                ["Discoverability", data.layerScores.discoverability],
                ["Clarity", data.layerScores.clarity],
                ["Authority", data.layerScores.authority],
                ["Trust", data.layerScores.trust],
                ["Share of voice", data.layerScores.shareOfVoice],
              ] as const
            ).map(([label, score]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="font-medium">{score}%</span>
                </div>
                <Progress value={score} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Predictive alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.predictedIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No issues predicted. Run an audit to enable forecasting.
              </p>
            ) : (
              <div className="space-y-3">
                {data.predictedIssues.map((issue, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{issue.issue}</p>
                      <Badge variant="secondary">
                        {Math.round(issue.confidence * 100)}%
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Expected by {new Date(issue.expectedDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ClientVsNetworkSection clientId={clientId} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Competitive intelligence</CardTitle>
          </CardHeader>
          <CardContent>
            {data.competitorBenchmarking.topCompetitors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add competitors in the latest audit to enable benchmarking.
              </p>
            ) : (
              <div className="space-y-3">
                {data.competitorBenchmarking.topCompetitors.map((competitor) => (
                  <div
                    key={competitor.name}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        #{competitor.rank} {competitor.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {competitor.brandMentions} mentions · {competitor.aiVisibility}% visibility
                      </p>
                    </div>
                    <Badge
                      variant={competitor.gapVsClient > 0 ? "destructive" : "secondary"}
                    >
                      {competitor.gapVsClient > 0 ? "+" : ""}
                      {competitor.gapVsClient} vs client
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agency impact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <DollarSign className="mb-2 h-5 w-5 text-green-600" />
              <p className="text-2xl font-bold">
                ${data.agencyMetrics.totalValueCreated.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Value created</p>
            </div>
            <div className="rounded-lg border p-4">
              <Clock className="mb-2 h-5 w-5 text-blue-600" />
              <p className="text-2xl font-bold">{data.agencyMetrics.hoursSaved}h</p>
              <p className="text-xs text-muted-foreground">Hours saved</p>
            </div>
            <div className="rounded-lg border p-4">
              <Heart className="mb-2 h-5 w-5 text-pink-600" />
              <p className="text-2xl font-bold">{data.agencyMetrics.clientSatisfaction}%</p>
              <p className="text-xs text-muted-foreground">Client satisfaction</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
