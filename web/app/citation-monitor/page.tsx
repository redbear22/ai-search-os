"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import type { CitationCheck, CitationGap } from "@/lib/ai-citation-monitor";
import { useActionStore } from "@/store/actionStore";

const severityColors = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
};

export default function CitationMonitorPage() {
  const addAction = useActionStore((s) => s.addAction);
  const [queries, setQueries] = useState<string[]>([""]);
  const [brandName, setBrandName] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([""]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [gaps, setGaps] = useState<CitationGap[]>([]);
  const [results, setResults] = useState<CitationCheck[]>([]);

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

  const runMonitor = async () => {
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
    toast.info("Running citation check across 4 AI platforms...", {
      duration: 10000,
    });

    try {
      const response = await fetch("/api/citation-monitor/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: validQueries,
          brandName: brandName.trim(),
          competitors: validCompetitors,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGaps(data.gaps);
        setResults(data.results);
        toast.success(
          `Found ${data.gapsFound} citation gaps across ${data.totalChecked} checks`
        );
      } else {
        toast.error(data.error || "Failed to run citation monitor");
      }
    } catch {
      toast.error("Failed to connect to citation monitor");
    } finally {
      setIsRunning(false);
    }
  };

  const saveWeeklySchedule = async () => {
    const validQueries = queries.filter((q) => q.trim());
    const validCompetitors = competitors.filter((c) => c.trim());

    if (!brandName.trim() || validQueries.length === 0) {
      toast.error("Enter brand name and at least one query first");
      return;
    }

    setIsSavingSchedule(true);
    try {
      const response = await fetch("/api/citation-monitor/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          queries: validQueries,
          competitors: validCompetitors,
          enabled: weeklyEnabled,
        }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success(
          weeklyEnabled
            ? "Weekly citation monitoring enabled"
            : "Schedule saved (monitoring paused)"
        );
      } else {
        toast.error(data.error || "Failed to save schedule");
      }
    } catch {
      toast.error("Failed to save weekly schedule");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const addToActionPlan = (gap: CitationGap) => {
    const sourceNote = gap.citationUrl ? ` Source: ${gap.citationUrl}` : "";
    addAction({
      id: `citation-${Date.now()}`,
      layerId: "authority",
      description: `Citation gap: ${gap.competitorCited} cited on ${gap.platform} for "${gap.query}" — your brand missing.${sourceNote}`,
      ownerTeam: "PR",
      ownerPerson: "",
      dueWeek: gap.severity === "high" ? 2 : gap.severity === "medium" ? 4 : 6,
      resourceAsks: [],
      status: "not_started",
      createdAt: new Date().toISOString(),
    });
    toast.success("Added to Action Plan");
  };

  return (
    <div className="container mx-auto space-y-6 py-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">AI Citation Monitor</h1>
        <p className="mt-1 text-muted-foreground">
          Track when AI platforms cite your competitors but not your brand
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monitor Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Your Brand Name</Label>
              <Input
                placeholder="e.g., Acme Corp"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>

            <div>
              <Label>Queries to Monitor</Label>
              {queries.map((query, index) => (
                <div key={index} className="mt-2 flex gap-2">
                  <Input
                    placeholder="e.g., best project management software"
                    value={query}
                    onChange={(e) => updateQuery(index, e.target.value)}
                    className="flex-1"
                  />
                  {queries.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuery(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addQuery}
                className="mt-2"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Query
              </Button>
            </div>

            <div>
              <Label>Competitors</Label>
              {competitors.map((comp, index) => (
                <div key={index} className="mt-2 flex gap-2">
                  <Input
                    placeholder="e.g., Competitor Name"
                    value={comp}
                    onChange={(e) => updateCompetitor(index, e.target.value)}
                    className="flex-1"
                  />
                  {competitors.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCompetitor(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addCompetitor}
                className="mt-2"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Competitor
              </Button>
            </div>

            <LoadingButton onClick={runMonitor} loading={isRunning} className="w-full">
              {isRunning ? "Checking 4 AI platforms..." : "Run Citation Monitor"}
            </LoadingButton>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={weeklyEnabled}
                  onChange={(e) => setWeeklyEnabled(e.target.checked)}
                  className="rounded border-input"
                />
                Enable weekly automated monitoring (Mondays 9:00 UTC)
              </label>
              <LoadingButton
                variant="outline"
                onClick={saveWeeklySchedule}
                loading={isSavingSchedule}
                className="w-full"
              >
                {isSavingSchedule ? "Saving..." : "Save for weekly cron"}
              </LoadingButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Citation Intelligence</CardTitle>
          </CardHeader>
          <CardContent>
            {gaps.length > 0 ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-500">
                    {gaps.length}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Citation Gaps Found
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Top Gap:</p>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm">{gaps[0]?.query}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {gaps[0]?.competitorCited} cited by {gaps[0]?.platform}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No gaps detected yet"
                description="Run a citation monitor to see where competitors are winning"
                icon="search"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Citation Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gaps.map((gap, index) => (
                <div
                  key={index}
                  className="hover-lift flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge className={severityColors[gap.severity]}>
                        {gap.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{gap.platform}</Badge>
                    </div>
                    <p className="font-medium">&ldquo;{gap.query}&rdquo;</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="text-red-500">{gap.competitorCited}</span>{" "}
                      cited but your brand is missing
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
                  <Button size="sm" onClick={() => addToActionPlan(gap)}>
                    Add to Action Plan
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monitor Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-green-500/10 p-3 text-center">
                <CheckCircle className="mx-auto mb-1 h-5 w-5 text-green-500" />
                <div className="text-xl font-bold">
                  {results.filter((r) => r.brandCited).length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Your brand cited
                </div>
              </div>
              <div className="rounded-lg bg-red-500/10 p-3 text-center">
                <AlertTriangle className="mx-auto mb-1 h-5 w-5 text-red-500" />
                <div className="text-xl font-bold">
                  {
                    results.filter(
                      (r) => !r.brandCited && r.competitorCited.length > 0
                    ).length
                  }
                </div>
                <div className="text-xs text-muted-foreground">
                  Missed opportunities
                </div>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                <div className="text-xl font-bold">{results.length}</div>
                <div className="text-xs text-muted-foreground">
                  Total checks
                </div>
              </div>
              <div className="rounded-lg bg-purple-500/10 p-3 text-center">
                <div className="text-xl font-bold">
                  {new Set(results.map((r) => r.platform)).size}
                </div>
                <div className="text-xs text-muted-foreground">
                  AI platforms
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
