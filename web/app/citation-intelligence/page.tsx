"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Bot, Plus, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import { scoreCitationRemote } from "@/lib/client/proprietary-api";
import {
  saveAuditHistoryEntry,
  type AuditHistoryEntry,
  type CitationGap,
  type CitationIntelligence,
  type CitationRecommendation,
} from "@/lib/citation-intelligence";
import { useActionStore } from "@/store/actionStore";

const priorityColors = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
};

const PIE_COLORS = ["#22c55e", "#ef4444"];
const AUDIT_HISTORY_KEY = "citation_audit_history";

export default function CitationIntelligencePage() {
  const addAction = useActionStore((s) => s.addAction);
  const [queries, setQueries] = useState<string[]>([
    "best AI search tools",
    "SEO trends 2026",
    "enterprise SEO platform",
  ]);
  const [brandName, setBrandName] = useState("");
  const [domain, setDomain] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([
    "Semrush",
    "Ahrefs",
    "Moz",
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [data, setData] = useState<CitationIntelligence | null>(null);
  const [citationScore, setCitationScore] = useState<number | null>(null);
  const [history, setHistory] = useState<AuditHistoryEntry[]>([]);

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem(AUDIT_HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved) as AuditHistoryEntry[]);
      }
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const runAudit = async () => {
    const validQueries = queries.filter((q) => q.trim());
    const validCompetitors = competitors.filter((c) => c.trim());

    if (!brandName.trim()) {
      toast.error("Please enter your brand name");
      return;
    }

    if (validQueries.length === 0) {
      toast.error("Please add at least one query");
      return;
    }

    setIsRunning(true);
    toast.info("Running citation audit across 4 AI platforms...");

    try {
      const response = await fetch("/api/citation-intelligence/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: validQueries,
          brandName: brandName.trim(),
          competitors: validCompetitors,
          domain: domain.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const intel = result.data as CitationIntelligence;
        setData(intel);

        const citations = [
          ...intel.citationGaps.map((gap) => ({
            platform: gap.platform,
            query: gap.query,
            cited: false,
            citationUrl: gap.citationUrl,
            publication: gap.competitorCited,
          })),
          ...intel.uniqueSources.map((source) => ({
            publication: source,
            cited: true,
            confidenceScore: intel.shareOfVoice / 100,
          })),
        ];

        if (citations.length > 0) {
          try {
            const scored = await scoreCitationRemote({
              brandName: brandName.trim(),
              citations,
            });
            setCitationScore(scored.normalizedScore ?? null);
          } catch {
            setCitationScore(null);
          }
        }

        saveAuditHistoryEntry({
          timestamp: new Date().toISOString(),
          brandMentionCount: intel.brandMentionCount,
          shareOfVoice: intel.shareOfVoice,
          totalCitations: intel.totalCitations,
          citationGaps: intel.citationGaps.length,
        });
        loadHistory();
        toast.success(
          `Audit complete! ${result.data.shareOfVoice.toFixed(1)}% Share of Voice`
        );
      } else {
        toast.error(result.error || "Audit failed");
      }
    } catch {
      toast.error("Failed to run citation audit");
    } finally {
      setIsRunning(false);
    }
  };

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

  const addGapToActionPlan = (gap: CitationGap) => {
    addAction({
      id: `cite-gap-${Date.now()}`,
      layerId: "authority",
      description: `Citation gap: ${gap.competitorCited} cited on ${gap.platform} for "${gap.query}" — your brand missing`,
      ownerTeam: "PR",
      ownerPerson: "",
      dueWeek: gap.priority === "critical" ? 1 : gap.priority === "high" ? 2 : 4,
      resourceAsks: [],
      status: "not_started",
      createdAt: new Date().toISOString(),
    });
    toast.success("Added to Action Plan");
  };

  const addRecommendationToActionPlan = (rec: CitationRecommendation) => {
    addAction({
      id: `cite-rec-${Date.now()}`,
      layerId: "clarity",
      description: rec.action,
      ownerTeam: "Brand Strategy",
      ownerPerson: "",
      dueWeek: rec.estimatedImpact === "high" ? 2 : 4,
      resourceAsks: [rec.targetPlatform, rec.targetQuery],
      status: "not_started",
      createdAt: new Date().toISOString(),
    });
    toast.success("Added to Action Plan");
  };

  const pieData = data
    ? [
        { name: "Your Brand", value: data.brandMentionCount },
        { name: "Competitors", value: data.competitorMentionCount },
      ]
    : [];

  return (
    <div className="container mx-auto space-y-6 py-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Citation Intelligence</h1>
        <p className="mt-1 text-muted-foreground">
          Unmatchable AI citation tracking + bot intelligence + origin signals
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4 lg:col-span-1">
              <div>
                <Label>Your Brand</Label>
                <Input
                  placeholder="Brand name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                />
              </div>
              <div>
                <Label>Domain (optional)</Label>
                <Input
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </div>
            </div>
            <div className="lg:col-span-3">
              <Label>Queries to Monitor</Label>
              <div className="mt-2 space-y-2">
                {queries.map((query, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
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
                <Button variant="outline" size="sm" onClick={addQuery}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Query
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Label>Competitors</Label>
            <div className="mt-2 space-y-2">
              {competitors.map((comp, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
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

          <LoadingButton onClick={runAudit} loading={isRunning} className="mt-4 w-full">
            {isRunning ? (
              "Running Citation Audit..."
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Citation Intelligence Audit
              </>
            )}
          </LoadingButton>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Share of Voice</p>
                <p className="text-3xl font-bold">
                  {data.shareOfVoice.toFixed(1)}%
                </p>
                <Progress value={data.shareOfVoice} className="mt-2" />
              </CardContent>
            </Card>
            {citationScore !== null ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">Citation Score</p>
                  <p className="text-3xl font-bold">{citationScore}</p>
                  <Progress value={citationScore} className="mt-2" />
                </CardContent>
              </Card>
            ) : null}
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Your Citations</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {data.brandMentionCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Competitor Citations
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {data.competitorMentionCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Unique Sources</p>
                <p className="text-3xl font-bold">{data.uniqueSources.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Origin Signals</p>
                <p className="text-3xl font-bold">
                  {data.originSignalsDetected}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="gaps">Citation Gaps</TabsTrigger>
              <TabsTrigger value="bots">Bot Intelligence</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Share of Voice Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {history.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={(v) =>
                              new Date(v).toLocaleDateString()
                            }
                          />
                          <YAxis />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="shareOfVoice"
                            stroke="#22c55e"
                            fill="#22c55630"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="py-12 text-center text-sm text-muted-foreground">
                        Run an audit to build trend history
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Citation Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label
                        >
                          {pieData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="gaps">
              <Card>
                <CardHeader>
                  <CardTitle>Citation Gaps – Where Competitors Win</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.citationGaps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No citation gaps detected in this audit.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {data.citationGaps.map((gap, idx) => (
                        <div
                          key={idx}
                          className="hover-lift flex items-start justify-between rounded-lg border p-4"
                        >
                          <div>
                            <div className="mb-1 flex items-center gap-2">
                              <Badge className={priorityColors[gap.priority]}>
                                {gap.priority.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {gap.platform}
                              </Badge>
                            </div>
                            <p className="font-medium">
                              &ldquo;{gap.query}&rdquo;
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              <span className="text-red-500">
                                {gap.competitorCited}
                              </span>{" "}
                              cited, but your brand missing
                            </p>
                            {gap.citationUrl && (
                              <a
                                href={gap.citationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 flex items-center gap-1 text-xs text-blue-500 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View source
                              </a>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addGapToActionPlan(gap)}
                          >
                            Add to Action Plan
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bots">
              <Card>
                <CardHeader>
                  <CardTitle>AI Crawler Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.botActivity.map((bot, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            <span className="font-medium">{bot.botName}</span>
                            <Badge variant="outline" className="text-xs">
                              {bot.userAgent}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Last check:{" "}
                            {new Date(bot.lastVisit).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {bot.pagesCrawled > 0 ? "Allowed" : "Blocked"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            robots.txt
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations">
              <Card>
                <CardHeader>
                  <CardTitle>AI-Generated Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="hover-lift flex items-start justify-between rounded-lg border p-4"
                      >
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <Badge
                              className={
                                rec.estimatedImpact === "high"
                                  ? "bg-green-500"
                                  : "bg-yellow-500"
                              }
                            >
                              {rec.estimatedImpact.toUpperCase()} impact
                            </Badge>
                          </div>
                          <p className="font-medium">{rec.action}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Target: {rec.targetPlatform} | Query:{" "}
                            {rec.targetQuery}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addRecommendationToActionPlan(rec)}
                        >
                          Add to Action Plan
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Audit History (52 weeks)</CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(v) =>
                            new Date(v).toLocaleDateString()
                          }
                        />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="brandMentionCount"
                          stroke="#22c55e"
                          name="Your Citations"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="shareOfVoice"
                          stroke="#3b82f6"
                          name="Share of Voice %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      No audit history yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
