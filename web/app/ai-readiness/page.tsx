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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import type { AIReadinessScore, CategoryScore, Recommendation } from "@/lib/ai-readiness";
import { useActionStore } from "@/store/actionStore";

const gradeColors = {
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

const categoryLabels: Record<keyof AIReadinessScore["categories"], string> = {
  structuredData: "Structured Data",
  answerExtractability: "Answer Extractability",
  llmsTxt: "LLMs.txt",
  aiCrawlerAccess: "AI Crawler Access",
  entityClarity: "Entity Clarity",
  contentQuality: "Content Quality",
};

function CategoryItemsCard({
  title,
  category,
}: {
  title: string;
  category: CategoryScore;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({category.score}/{category.max})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {category.items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start justify-between rounded-lg border p-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {item.passed ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-medium">{item.name}</span>
              </div>
              {item.details && (
                <p className="mt-1 text-sm text-muted-foreground">{item.details}</p>
              )}
              {!item.passed && item.fixSuggestion && (
                <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                  → {item.fixSuggestion}
                </p>
              )}
            </div>
            <Badge variant={item.passed ? "secondary" : "destructive"}>
              {item.passed ? "Pass" : "Fail"}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AIReadinessPage() {
  const addAction = useActionStore((s) => s.addAction);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<AIReadinessScore | null>(null);

  const analyzeUrl = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/ai-readiness/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setScore(data.score);
        toast.success("Analysis complete");
      } else {
        toast.error(data.error || "Analysis failed");
      }
    } catch {
      toast.error("Failed to analyze URL");
    } finally {
      setLoading(false);
    }
  };

  const addToActionPlan = (recommendation: Recommendation) => {
    addAction({
      id: `readiness-${Date.now()}`,
      layerId: "discoverability",
      description: `${recommendation.title}: ${recommendation.fix} (${url})`,
      ownerTeam: "SEO",
      ownerPerson: "",
      dueWeek:
        recommendation.priority === "critical"
          ? 1
          : recommendation.priority === "high"
            ? 2
            : 4,
      resourceAsks: [recommendation.estimatedEffort],
      status: "not_started",
      createdAt: new Date().toISOString(),
    });
    toast.success("Added to Action Plan");
  };

  return (
    <div className="container mx-auto space-y-6 py-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">AI Readiness Score</h1>
        <p className="mt-1 text-muted-foreground">
          Measure and improve how AI search engines see your content
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>URL to Analyze</Label>
              <Input
                placeholder="https://example.com/page"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyzeUrl()}
              />
            </div>
            <LoadingButton onClick={analyzeUrl} loading={loading} className="mt-6">
              {loading ? "Analyzing..." : "Analyze"}
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      {score && (
        <>
          <Card className="gradient-border">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Overall AI Readiness Score
                  </div>
                  <div className="mt-2 text-6xl font-bold">{score.overall}</div>
                  <div className="mt-2 flex items-center justify-center gap-2 md:justify-start">
                    <Badge className={gradeColors[score.grade]}>
                      Grade {score.grade}
                    </Badge>
                    <Badge variant="outline">
                      {score.overall >= 80
                        ? "Excellent"
                        : score.overall >= 60
                          ? "Good"
                          : score.overall >= 40
                            ? "Needs Work"
                            : "Poor"}
                    </Badge>
                  </div>
                </div>

                <div className="w-full flex-1 space-y-3">
                  {(
                    Object.entries(score.categories) as Array<
                      [keyof AIReadinessScore["categories"], CategoryScore]
                    >
                  ).map(([key, cat]) => {
                    const percent = (cat.score / cat.max) * 100;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm">
                          <span>{categoryLabels[key]}</span>
                          <span>
                            {cat.score}/{cat.max}
                          </span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="recommendations">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-7">
              <TabsTrigger value="recommendations">Fix First</TabsTrigger>
              <TabsTrigger value="structuredData">Schema</TabsTrigger>
              <TabsTrigger value="extractability">Extractability</TabsTrigger>
              <TabsTrigger value="llms">LLMs.txt</TabsTrigger>
              <TabsTrigger value="crawlers">AI Crawlers</TabsTrigger>
              <TabsTrigger value="entity">Entity</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>

            <TabsContent value="recommendations" className="space-y-3">
              {score.recommendations.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
                    <p className="text-muted-foreground">No critical issues found!</p>
                  </CardContent>
                </Card>
              ) : (
                score.recommendations.map((rec, idx) => (
                  <Card key={idx} className="hover-lift">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Badge className={priorityColors[rec.priority]}>
                              {rec.priority.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{rec.category}</Badge>
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="mr-1 h-3 w-3" />
                              {rec.estimatedEffort}
                            </Badge>
                          </div>
                          <h3 className="mb-1 font-semibold">{rec.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {rec.description}
                          </p>
                          <div className="mt-2 rounded bg-muted p-2 text-sm">
                            <span className="font-medium">Fix: </span>
                            {rec.fix}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addToActionPlan(rec)}
                          className="ml-4 shrink-0"
                        >
                          Add to Plan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="structuredData">
              <CategoryItemsCard
                title="Structured Data (Schema.org)"
                category={score.categories.structuredData}
              />
            </TabsContent>

            <TabsContent value="extractability">
              <CategoryItemsCard
                title="Answer Extractability"
                category={score.categories.answerExtractability}
              />
            </TabsContent>

            <TabsContent value="llms">
              <CategoryItemsCard
                title="LLMs.txt"
                category={score.categories.llmsTxt}
              />
            </TabsContent>

            <TabsContent value="crawlers">
              <CategoryItemsCard
                title="AI Crawler Access"
                category={score.categories.aiCrawlerAccess}
              />
            </TabsContent>

            <TabsContent value="entity">
              <CategoryItemsCard
                title="Entity Clarity"
                category={score.categories.entityClarity}
              />
            </TabsContent>

            <TabsContent value="content">
              <CategoryItemsCard
                title="Content Quality"
                category={score.categories.contentQuality}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
