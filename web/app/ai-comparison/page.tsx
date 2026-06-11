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
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import {
  runMultiModelComparison,
  type ComparisonModel,
  type ComparisonResult,
} from "@/lib/multi-model-comparison";
import { useActionStore } from "@/store/actionStore";

const modelColors: Record<ComparisonModel, string> = {
  chatgpt: "bg-green-500",
  perplexity: "bg-blue-500",
  claude: "bg-purple-500",
  gemini: "bg-red-500",
};

const modelNames: Record<ComparisonModel, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
  gemini: "Gemini",
};

function citationHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function AIComparisonPage() {
  const addAction = useActionStore((s) => s.addAction);
  const [queries, setQueries] = useState<string[]>([""]);
  const [brandName, setBrandName] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([""]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const runComparison = async () => {
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
    const newResults: ComparisonResult[] = [];

    try {
      for (const query of validQueries) {
        toast.info(`Comparing "${query}" across 4 AI models...`);

        const result = await runMultiModelComparison(
          query,
          brandName.trim(),
          validCompetitors
        );
        newResults.push(result);
        setResults([...newResults]);
      }

      toast.success(`Completed ${validQueries.length} comparisons`);
    } catch {
      toast.error("Comparison failed");
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard");
  };

  const addToActionPlan = (result: ComparisonResult) => {
    const missing =
      result.summary.missingInModels.length > 0
        ? result.summary.missingInModels.map((m) => modelNames[m]).join(", ")
        : "none";

    addAction({
      id: `comparison-${Date.now()}`,
      layerId: "clarity",
      description: `Multi-model gap: "${result.query}" — brand missing on ${missing} (${result.summary.brandMentionCount}/4 models mention ${result.brandName})`,
      ownerTeam: "Brand Strategy",
      ownerPerson: "",
      dueWeek: result.summary.missingInModels.length >= 2 ? 2 : 4,
      resourceAsks: [],
      status: "not_started",
      createdAt: new Date().toISOString(),
    });
    toast.success("Added to Action Plan");
  };

  const avgSentiment =
    results.length > 0
      ? (results.reduce((sum, r) => sum + r.summary.averageSentiment, 0) /
          results.length) *
        100
      : 0;

  return (
    <div className="container mx-auto space-y-6 py-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Multi-Model AI Comparison</h1>
        <p className="mt-1 text-muted-foreground">
          Compare how ChatGPT, Perplexity, Claude, and Gemini perceive your brand
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Comparison Configuration</CardTitle>
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
              <Label>Queries to Test</Label>
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
              <Label>Competitors (Optional)</Label>
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

            <LoadingButton onClick={runComparison} loading={isRunning} className="w-full">
              {isRunning ? "Comparing Across 4 AI Models..." : "Run Multi-Model Comparison"}
            </LoadingButton>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Comparison Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {results.reduce(
                        (sum, r) => sum + r.summary.brandMentionCount,
                        0
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Brand Mentions
                    </div>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-3">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {results.reduce(
                        (sum, r) => sum + r.summary.missingInModels.length,
                        0
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Missed Opportunities
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Average Sentiment</div>
                  <Progress value={avgSentiment} className="h-2" />
                </div>
                <Button
                  variant="outline"
                  onClick={() => addToActionPlan(results[0])}
                >
                  Add Gaps to Action Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {results.map((result, idx) => (
        <Card key={result.id ?? idx} className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  &ldquo;{result.query}&rdquo;
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Compared across 4 AI models •{" "}
                  {new Date(result.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant={
                    result.summary.brandMentionCount === 4
                      ? "default"
                      : "destructive"
                  }
                >
                  {result.summary.brandMentionCount}/4 models mention you
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => addToActionPlan(result)}
                >
                  Add to Plan
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4">
              {result.responses.map((response) => {
                const preview =
                  response.response.length > 300
                    ? `${response.response.substring(0, 300)}...`
                    : response.response;

                return (
                  <div key={response.model} className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${modelColors[response.model]}`}
                        />
                        <span className="font-semibold">
                          {modelNames[response.model]}
                        </span>
                      </div>
                      {response.error ? (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      ) : response.brandMentioned ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-500/10 text-xs text-green-700 dark:text-green-300"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Brand mentioned
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          <XCircle className="mr-1 h-3 w-3" />
                          Not mentioned
                        </Badge>
                      )}
                    </div>

                    {response.error ? (
                      <p className="text-sm text-red-500">{response.error}</p>
                    ) : (
                      <>
                        <p className="line-clamp-6 text-sm">{preview}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {response.responseTime}ms
                          </div>
                          <div className="flex items-center gap-1 capitalize">
                            <TrendingUp className="h-3 w-3" />
                            {response.sentiment}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() =>
                              copyToClipboard(
                                response.response,
                                `${result.id}_${response.model}`
                              )
                            }
                          >
                            {copiedId === `${result.id}_${response.model}` ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>

                        {response.citations.length > 0 && (
                          <div className="border-t pt-2">
                            <p className="mb-1 text-xs font-medium">Citations:</p>
                            <div className="space-y-1">
                              {response.citations.slice(0, 2).map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 truncate text-xs text-blue-500 hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                  {citationHostname(url)}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {result.summary.consensusPoints.length > 0 && (
              <div className="border-t bg-muted/20 p-4">
                <p className="mb-2 text-sm font-medium">
                  Consensus across models
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.summary.consensusPoints.map((point, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {point}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.summary.missingInModels.length > 0 && (
              <div className="border-t bg-yellow-500/10 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Missing from:
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {result.summary.missingInModels
                        .map((m) => modelNames[m])
                        .join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                      Consider updating content or building citations for these
                      platforms.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
