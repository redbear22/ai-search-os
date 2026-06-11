"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  DollarSign,
  Loader2,
  Target,
  TrendingUp,
  Clock,
  BarChart3,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ChartData, PredictiveROI } from "@/types/predictive-roi";

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

function ChartPanel({ chart }: { chart: ChartData }) {
  const data = chart.labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    for (const ds of chart.datasets) {
      row[ds.label] = ds.data[i] ?? 0;
    }
    return row;
  });

  const color = chart.datasets[0]?.color ?? "#3b82f6";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{chart.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            {chart.type === "bar" ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey={chart.datasets[0].label} fill={color} radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : chart.type === "area" ? (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Area
                  type="monotone"
                  dataKey={chart.datasets[0].label}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.2}
                />
              </AreaChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey={chart.datasets[0].label}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function effortVariant(effort: string): "default" | "secondary" | "destructive" {
  if (effort === "high") return "destructive";
  if (effort === "medium") return "default";
  return "secondary";
}

export default function ClientROIPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [data, setData] = useState<PredictiveROI | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/agency/clients/${clientId}/roi`);
    if (res.ok) {
      setData((await res.json()) as PredictiveROI);
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
        Predictive ROI unavailable. Run an audit to enable forecasting.
      </div>
    );
  }

  const { opportunityAnalysis: opp, realTimeROI: rt, clientFacing: cf } = data;

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
          <p className="text-muted-foreground">Predictive ROI — opportunity & engagement value</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            <Sparkles className="mr-1 h-3 w-3" />
            {cf.confidenceScore}% confidence
          </Badge>
          <p className="text-xs text-muted-foreground">
            Updated {new Date(data.lastUpdated).toLocaleString()}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Executive summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{cf.executiveSummary}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Before engagement — opportunity</h2>
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                Current SOV
              </div>
              <p className="mt-2 text-3xl font-bold">{opp.currentSOV}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Potential SOV
              </div>
              <p className="mt-2 text-3xl font-bold text-green-600">{opp.potentialSOV}%</p>
              <Progress
                value={opp.potentialSOV}
                className="mt-2 h-1.5"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Additional citations</p>
              <p className="mt-2 text-3xl font-bold">{opp.additionalCitations}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Traffic value
              </div>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(opp.estimatedTrafficValue)}</p>
              <p className="text-xs text-muted-foreground">Annual estimate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4 text-green-600" />
                Revenue impact
              </div>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {formatCurrency(opp.estimatedRevenueImpact)}
              </p>
              <p className="text-xs text-muted-foreground">At default conversion</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">During engagement — real-time ROI</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Improvement rate
              </div>
              <p className="mt-2 text-3xl font-bold">{rt.improvementRate}%</p>
              <p className="text-xs text-muted-foreground">Per week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Value delivered
              </div>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(rt.valueDelivered)}</p>
              <p className="text-xs text-muted-foreground">Cumulative</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Time to break-even
              </div>
              <p className="mt-2 text-3xl font-bold">{rt.timeToBreakEven}d</p>
              <p className="text-xs text-muted-foreground">
                vs {formatCurrency(data.monthlyRetainer)}/mo retainer
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                Projected monthly
              </div>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {formatCurrency(rt.projectedMonthlyValue)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Charts</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {cf.charts.map((chart) => (
            <ChartPanel key={chart.id} chart={chart} />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prioritized recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          {cf.recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open gaps. Run an audit to identify ROI opportunities.
            </p>
          ) : (
            <div className="space-y-3">
              {cf.recommendations.map((rec) => (
                <div
                  key={rec.gapId ?? rec.priority}
                  className="flex items-start justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {rec.priority}
                      </span>
                      <p className="text-sm font-medium">{rec.action}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 pl-8">
                      <Badge variant="outline">{rec.layer}</Badge>
                      <Badge variant="secondary">{rec.severity}</Badge>
                      <Badge variant={effortVariant(rec.effort)}>{rec.effort} effort</Badge>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-green-600">
                    {formatCurrency(rec.estimatedImpact)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
