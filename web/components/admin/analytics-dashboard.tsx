"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Database,
  FileText,
  Target,
  TrendingUp,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { toastApiError } from "@/lib/api-error";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { AnalyticsDataApiResponse } from "@/lib/analytics-dashboard";

const COLORS = {
  discoverability: "#3b82f6",
  clarity: "#22c55e",
  authority: "#a855f7",
  trust: "#f97316",
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  worked: "#22c55e",
  partial: "#eab308",
  didnt_work: "#ef4444",
} as const;

type ColorKey = keyof typeof COLORS;

function layerColor(name: string): string {
  return COLORS[name as ColorKey] ?? "#64748b";
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsDataApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/analytics/data", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Unauthorized — unlock the dashboard first"
              : "Failed to load analytics"
          );
        }

        const result = (await response.json()) as AnalyticsDataApiResponse;
        const isEmpty = result.summary.totalAudits === 0 && result.summary.totalGaps === 0;

        if (isEmpty && process.env.NODE_ENV === "development") {
          const demoResponse = await fetch("/api/analytics/data?demo=1", {
            credentials: "same-origin",
            cache: "no-store",
          });
          if (demoResponse.ok) {
            setData((await demoResponse.json()) as AnalyticsDataApiResponse);
            setUsingDemo(true);
            return;
          }
        }

        setData(result);
        setUsingDemo(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load analytics";
        setError(message);
        toastApiError();
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
          <h2 className="mb-2 text-xl font-semibold">Analytics unavailable</h2>
          <p className="text-muted-foreground">
            {error ||
              "No analytics data collected yet. Complete audits to start building your data moat."}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Enable <code>NEXT_PUBLIC_ANALYTICS_ENABLED=true</code> and accept the consent banner
            on the app.
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    summary,
    gapsByLayer,
    gapsBySeverity,
    outcomesByResult,
    timeSeries,
    topSources,
    recentEvents,
  } = data;

  const layerData = Object.entries(gapsByLayer).map(([name, value]) => ({ name, value }));
  const severityData = Object.entries(gapsBySeverity).map(([name, value]) => ({ name, value }));
  const outcomeData = Object.entries(outcomesByResult).map(([name, value]) => ({ name, value }));

  const successDenominator =
    outcomesByResult.worked + outcomesByResult.partial + outcomesByResult.didnt_work;
  const successRate =
    successDenominator > 0
      ? Math.round(
          ((outcomesByResult.worked + outcomesByResult.partial) / successDenominator) * 100
        )
      : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Your data moat — aggregated, anonymous insights from all audits
          </p>
        </div>
        {usingDemo && (
          <Badge variant="secondary">Demo data — collect real events from /gaps</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Audits</p>
                <p className="text-3xl font-bold">{summary.totalAudits}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Gaps</p>
                <p className="text-3xl font-bold">{summary.totalGaps}</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fixes Generated</p>
                <p className="text-3xl font-bold">{summary.totalFixesGenerated}</p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fix Acceptance Rate</p>
                <p className="text-3xl font-bold">{summary.fixAcceptanceRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6 flex h-auto flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="sources">Top Sources</TabsTrigger>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Audits Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeries.audits}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Audits" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Gaps by Layer</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={layerData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {layerData.map((entry) => (
                        <Cell key={entry.name} fill={layerColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Gaps by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={severityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip />
                    <Bar dataKey="value">
                      {severityData.map((entry) => (
                        <Cell key={entry.name} fill={layerColor(entry.name)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Gaps by Layer</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={layerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip />
                    <Bar dataKey="value">
                      {layerData.map((entry) => (
                        <Cell key={entry.name} fill={layerColor(entry.name)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Fix Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={outcomeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {outcomeData.map((entry) => (
                        <Cell key={entry.name} fill={layerColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Success Rate</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-2 text-6xl font-bold text-green-500">{successRate}%</div>
                <p className="text-muted-foreground">of fixes work or partially work</p>
                <div className="mt-6 space-y-1 text-sm text-muted-foreground">
                  <p>Worked: {outcomesByResult.worked}</p>
                  <p>Partial: {outcomesByResult.partial}</p>
                  <p>Didn&apos;t work: {outcomesByResult.didnt_work}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Top Gap Sources (Publications / Competitors)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topSources.map((source) => (
                  <div
                    key={source.source}
                    className="flex items-center justify-between rounded-md bg-muted p-2"
                  >
                    <span className="font-mono text-sm">{source.source}</span>
                    <Badge variant="secondary">{source.count} gaps</Badge>
                  </div>
                ))}
                {topSources.length === 0 && (
                  <p className="py-8 text-center text-muted-foreground">No sources tracked yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {recentEvents.map((event, idx) => (
                  <div
                    key={`${event.timestamp}-${idx}`}
                    className="flex items-start justify-between border-b border-border p-2"
                  >
                    <div className="flex flex-wrap gap-2">
                      <Badge>{event.eventType.replace(/_/g, " ")}</Badge>
                      {event.layer && <Badge variant="outline">{event.layer}</Badge>}
                      {event.severity && <Badge variant="outline">{event.severity}</Badge>}
                    </div>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(event.receivedAt || event.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
                {recentEvents.length === 0 && (
                  <p className="py-8 text-center text-muted-foreground">No events recorded yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-center text-sm text-muted-foreground">
        <p>Your data moat is growing. Every audit adds to these insights.</p>
        <p className="mt-1 text-xs">Anonymous aggregated data — no personal or brand information stored</p>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
