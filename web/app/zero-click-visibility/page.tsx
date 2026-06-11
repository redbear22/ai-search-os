"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { Eye, Plus, Trash2 } from "lucide-react";
import {
  saveZeroClickTrendEntry,
  type ZeroClickMetrics,
  type ZeroClickRecommendation,
} from "@/lib/zero-click-visibility";
import { useActionStore } from "@/store/actionStore";

const platformColors = {
  chatgpt: "#10a37f",
  perplexity: "#1a73e8",
  claude: "#7c3aed",
  gemini: "#ea4335",
};

const gradeColors: Record<ZeroClickMetrics["overall"]["grade"], string> = {
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-yellow-500",
  D: "bg-orange-500",
  F: "bg-red-500",
};

const priorityColors = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
};

export default function ZeroClickVisibilityPage() {
  const addAction = useActionStore((s) => s.addAction);
  const [brandName, setBrandName] = useState("");
  const [queries, setQueries] = useState<string[]>([""]);
  const [competitors, setCompetitors] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<ZeroClickMetrics | null>(null);

  const addQuery = () => setQueries([...queries, ""]);
  const removeQuery = (index: number) =>
    setQueries(queries.filter((_, i) => i !== index));
  const updateQuery = (index: number, value: string) => {
    const next = [...queries];
    next[index] = value;
    setQueries(next);
  };

  const addCompetitor = () => setCompetitors([...competitors, ""]);
  const removeCompetitor = (index: number) =>
    setCompetitors(competitors.filter((_, i) => i !== index));
  const updateCompetitor = (index: number, value: string) => {
    const next = [...competitors];
    next[index] = value;
    setCompetitors(next);
  };

  const calculateMetrics = async () => {
    const validQueries = queries.filter((q) => q.trim());

    if (!brandName.trim()) {
      toast.error("Please enter your brand name");
      return;
    }

    if (validQueries.length === 0) {
      toast.error("Please add at least one query");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/zero-click-visibility/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          queries: validQueries,
          competitors: competitors.filter((c) => c.trim()),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const result = data.metrics as ZeroClickMetrics;
        const trends = saveZeroClickTrendEntry({
          date: new Date().toISOString(),
          brandMentions: result.brandMentionRate.totalMentions,
          shareOfVoice: result.shareOfVoice.brand,
          citationCount: result.citationDensity.yourCitations,
        });
        setMetrics({ ...result, trends });

        toast.success("Zero-click visibility metrics calculated");
      } else {
        toast.error(data.error || "Calculation failed");
      }
    } catch {
      toast.error("Failed to calculate metrics");
    } finally {
      setLoading(false);
    }
  };

  const addToPlan = (rec: ZeroClickRecommendation) => {
    addAction({
      id: `zero-click-${Date.now()}`,
      layerId: "clarity",
      description: `${rec.title}: ${rec.description}`,
      ownerTeam: "Brand Strategy",
      ownerPerson: "",
      dueWeek: rec.priority === "critical" ? 1 : rec.priority === "high" ? 2 : 4,
      resourceAsks: [`+${rec.expectedImprovement} pts`, rec.effort],
      status: "not_started",
      createdAt: new Date().toISOString(),
    });
    toast.success("Added to Action Plan");
  };

  const radarData = metrics
    ? [
        {
          platform: "ChatGPT",
          value: metrics.platformSpecific.chatgpt.mentionRate,
        },
        {
          platform: "Perplexity",
          value: metrics.platformSpecific.perplexity.mentionRate,
        },
        {
          platform: "Claude",
          value: metrics.platformSpecific.claude.mentionRate,
        },
        {
          platform: "Gemini",
          value: metrics.platformSpecific.gemini.mentionRate,
        },
      ]
    : [];

  const voiceTotal = metrics?.shareOfVoice.total || 1;
  const competitorData = metrics
    ? [
        { name: brandName || "Your Brand", value: metrics.shareOfVoice.brand },
        ...Object.entries(metrics.shareOfVoice.competitors).map(
          ([name, count]) => ({
            name,
            value: (count / voiceTotal) * 100,
          })
        ),
      ]
    : [];

  return (
    <div className="container mx-auto space-y-6 py-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Zero-Click Visibility Metrics</h1>
        <p className="mt-1 text-muted-foreground">
          Measure brand influence in AI answers — the new primary KPI for 2026
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label>Your Brand Name</Label>
              <Input
                placeholder="e.g., Acme Corp"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>

            <div>
              <Label>Target Queries</Label>
              {queries.map((query, idx) => (
                <div key={idx} className="mt-2 flex gap-2">
                  <Input
                    placeholder="e.g., best project management software"
                    value={query}
                    onChange={(e) => updateQuery(idx, e.target.value)}
                    className="flex-1"
                  />
                  {queries.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuery(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addQuery} className="mt-2">
                <Plus className="mr-1 h-4 w-4" />
                Add Query
              </Button>
            </div>

            <div>
              <Label>Competitors (Optional)</Label>
              <div className="mt-2 space-y-2">
                {competitors.map((comp, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="Competitor name"
                      value={comp}
                      onChange={(e) => updateCompetitor(idx, e.target.value)}
                      className="flex-1"
                    />
                    {competitors.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCompetitor(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addCompetitor}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Competitor
                </Button>
              </div>
            </div>

            <LoadingButton
              onClick={calculateMetrics}
              loading={loading}
              className="w-full"
            >
              {loading ? (
                "Calculating Zero-Click Metrics..."
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Calculate Zero-Click Visibility
                </>
              )}
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      {metrics && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="gradient-border">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Zero-Click Score</p>
                <p className="mt-2 text-4xl font-bold">{metrics.overall.score}</p>
                <Badge className={`mt-2 ${gradeColors[metrics.overall.grade]}`}>
                  Grade {metrics.overall.grade}
                </Badge>
                <p className="mt-1 text-xs text-muted-foreground">
                  Top {metrics.overall.percentile}% estimated
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Brand Mention Rate</p>
                <p className="mt-2 text-4xl font-bold">
                  {metrics.brandMentionRate.percentage.toFixed(1)}%
                </p>
                <Progress
                  value={metrics.brandMentionRate.percentage}
                  className="mt-2"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Share of Voice</p>
                <p className="mt-2 text-4xl font-bold">
                  {metrics.shareOfVoice.brand.toFixed(1)}%
                </p>
                <Progress value={metrics.shareOfVoice.brand} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Citation Density</p>
                <p className="mt-2 text-4xl font-bold">
                  {metrics.citationDensity.yourCitations}
                </p>
                <Badge variant="outline" className="mt-2 capitalize">
                  {metrics.citationDensity.citationQuality}
                </Badge>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="platform" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar
                      name="Mention Rate"
                      dataKey="value"
                      stroke="#3b82f6"
                      fill="#3b82f630"
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Share of Voice</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={competitorData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      height={70}
                      interval={0}
                    />
                    <YAxis unit="%" />
                    <Tooltip formatter={(v) => `${Number(v ?? 0).toFixed(1)}%`} />
                    <Bar dataKey="value" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {metrics.trends.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Zero-Click Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={metrics.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => new Date(v).toLocaleDateString()}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="brandMentions"
                      stroke="#22c55e"
                      name="Brand mentions"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="shareOfVoice"
                      stroke="#3b82f6"
                      name="Share of voice %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Platform-Specific Visibility</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {(
                  Object.entries(metrics.platformSpecific) as Array<
                    [
                      keyof typeof platformColors,
                      ZeroClickMetrics["platformSpecific"]["chatgpt"],
                    ]
                  >
                ).map(([platform, data]) => (
                  <div key={platform} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: platformColors[platform] }}
                      />
                      <span className="font-semibold capitalize">{platform}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mention rate</span>
                        <span className="font-medium">
                          {data.mentionRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Citations</span>
                        <span className="font-medium">{data.citationCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sentiment</span>
                        <span className="font-medium">
                          {(data.sentimentScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Response time</span>
                        <span className="font-medium">{data.responseTimeMs}ms</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {metrics.competitiveLandscape.gaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Competitive Gaps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.competitiveLandscape.gaps.slice(0, 8).map((gap, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <span>
                        <span className="font-medium">{gap.competitor}</span> on{" "}
                        <span className="capitalize">{gap.platform}</span> — &ldquo;
                        {gap.query}&rdquo;
                      </span>
                      <Badge variant="destructive">{gap.gapSize}% gap</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Zero-Click Optimization Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="hover-lift flex items-start justify-between rounded-lg border p-4"
                  >
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge className={priorityColors[rec.priority]}>
                          {rec.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {rec.type.replace("_", " ")}
                        </Badge>
                        <Badge variant="secondary">
                          +{rec.expectedImprovement} pts
                        </Badge>
                      </div>
                      <p className="font-medium">{rec.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {rec.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="ml-4 shrink-0"
                      onClick={() => addToPlan(rec)}
                    >
                      Add to Plan
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance by Query Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Object.entries(metrics.brandMentionRate.byQueryCategory).map(
                  ([category, rate]) => (
                    <div
                      key={category}
                      className="rounded-lg border p-4 text-center"
                    >
                      <p className="text-sm capitalize text-muted-foreground">
                        {category}
                      </p>
                      <p className="mt-1 text-2xl font-bold">
                        {typeof rate === "number" ? rate.toFixed(1) : "0"}%
                      </p>
                      <Progress
                        value={typeof rate === "number" ? rate : 0}
                        className="mt-2"
                      />
                    </div>
                  )
                )}
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Informational: knowledge-seeking • Commercial: product research •
                Navigational: brand lookup • Transactional: purchase intent
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
