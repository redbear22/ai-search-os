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
import { Bot, FileText } from "lucide-react";
import type {
  AgentOptimization,
  AgentReadinessScore,
} from "@/lib/agent-readiness";
import { useActionStore } from "@/store/actionStore";

const gradeColors: Record<AgentReadinessScore["grade"], string> = {
  "A+": "bg-emerald-500",
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

const categoryLabels: Record<
  keyof AgentReadinessScore["categories"],
  string
> = {
  semanticStructure: "Semantic Structure",
  extractability: "Extractability",
  entityDensity: "Entity Density",
  contextualDepth: "Contextual Depth",
  multiQueryOptimization: "Multi-Query",
  agentSignals: "Agent Signals",
};

export default function AgentReadinessPage() {
  const addAction = useActionStore((s) => s.addAction);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<AgentReadinessScore | null>(null);

  const analyzeUrl = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/agent-readiness/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setScore(data.score as AgentReadinessScore);
        toast.success("Agent readiness analysis complete");
      } else {
        toast.error(data.error || "Analysis failed");
      }
    } catch {
      toast.error("Failed to analyze URL");
    } finally {
      setLoading(false);
    }
  };

  const addToPlan = (rec: AgentOptimization) => {
    addAction({
      id: `agent-ready-${Date.now()}`,
      layerId: "discoverability",
      description: `${rec.title}: ${rec.fix} (${url})`,
      ownerTeam: "Content",
      ownerPerson: "",
      dueWeek: rec.priority === "critical" ? 1 : rec.priority === "high" ? 2 : 4,
      resourceAsks: [rec.estimatedEffort, `+${rec.estimatedImpact} pts`],
      status: "not_started",
      createdAt: new Date().toISOString(),
    });
    toast.success("Added to Action Plan");
  };

  return (
    <div className="container mx-auto space-y-6 py-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Agent-First Content Architecture</h1>
        <p className="mt-1 text-muted-foreground">
          Optimize your content for AI agent comprehension, not just humans
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
              {loading ? "Analyzing..." : "Analyze Agent Readiness"}
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
                    Agent Readiness Score
                  </div>
                  <div className="mt-2 text-6xl font-bold">{score.overall}</div>
                  <div className="mt-2 flex items-center justify-center gap-2 md:justify-start">
                    <Badge className={gradeColors[score.grade]}>
                      Grade {score.grade}
                    </Badge>
                    <Badge variant="outline">
                      {score.overall >= 85
                        ? "Agent-Optimized"
                        : score.overall >= 70
                          ? "Agent-Ready"
                          : score.overall >= 55
                            ? "Needs Work"
                            : "Agent-Unfriendly"}
                    </Badge>
                  </div>
                </div>

                <div className="w-full flex-1 space-y-2">
                  {(
                    Object.entries(score.categories) as Array<
                      [
                        keyof AgentReadinessScore["categories"],
                        AgentReadinessScore["categories"][keyof AgentReadinessScore["categories"]],
                      ]
                    >
                  ).map(([key, cat]) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm">
                        <span>{categoryLabels[key]}</span>
                        <span>
                          {cat.score}/{cat.max}
                        </span>
                      </div>
                      <Progress
                        value={(cat.score / cat.max) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent Simulation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-green-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Bot className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold">Extraction Result</span>
                  </div>
                  <p className="text-sm">
                    {score.agentSimulation.wouldAgentExtract ? (
                      <span className="text-green-600 dark:text-green-400">
                        Agent would extract key information
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">
                        Agent would struggle to extract
                      </span>
                    )}
                  </p>
                  <div className="mt-2">
                    <div className="text-sm font-medium">
                      Confidence: {score.agentSimulation.extractionConfidence}%
                    </div>
                    <Progress
                      value={score.agentSimulation.extractionConfidence}
                      className="mt-1 h-1"
                    />
                  </div>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold">Extracted Answer (Preview)</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {score.agentSimulation.extractedAnswer ||
                      "No clear answer could be extracted"}
                  </p>
                </div>
              </div>

              {score.agentSimulation.missingContext.length > 0 && (
                <div className="mt-4 rounded-lg bg-yellow-500/10 p-3">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Missing context for agents:
                  </p>
                  <ul className="mt-1 list-inside list-disc text-sm text-yellow-700 dark:text-yellow-300">
                    {score.agentSimulation.missingContext.map((ctx, i) => (
                      <li key={i}>{ctx}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent Optimization Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {score.recommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No optimization recommendations — content is agent-ready.
                </p>
              ) : (
                <div className="space-y-3">
                  {score.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="hover-lift flex items-start justify-between rounded-lg border p-4"
                    >
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge className={priorityColors[rec.priority]}>
                            {rec.priority.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{rec.category}</Badge>
                          <Badge variant="secondary" className="text-xs">
                            {rec.estimatedEffort} • +{rec.estimatedImpact} pts
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
                        className="ml-4 shrink-0"
                        onClick={() => addToPlan(rec)}
                      >
                        Add to Plan
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="semantic">
            <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-6">
              <TabsTrigger value="semantic">Semantic</TabsTrigger>
              <TabsTrigger value="extract">Extractability</TabsTrigger>
              <TabsTrigger value="entity">Entity</TabsTrigger>
              <TabsTrigger value="depth">Depth</TabsTrigger>
              <TabsTrigger value="multi">Multi-Query</TabsTrigger>
              <TabsTrigger value="signals">Agent Signals</TabsTrigger>
            </TabsList>

            <TabsContent value="semantic">
              <Card>
                <CardHeader>
                  <CardTitle>Semantic Structure Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between rounded border p-3">
                    <span>Heading Hierarchy (H1→H2→H3)</span>
                    <Badge
                      variant={
                        score.categories.semanticStructure.headingHierarchy >= 5
                          ? "default"
                          : "destructive"
                      }
                    >
                      {score.categories.semanticStructure.headingHierarchy}/8
                    </Badge>
                  </div>
                  <div className="flex justify-between rounded border p-3">
                    <span>List Density</span>
                    <Badge>
                      {score.categories.semanticStructure.listDensity}/8
                    </Badge>
                  </div>
                  <div className="flex justify-between rounded border p-3">
                    <span>Tables Present</span>
                    <Badge
                      variant={
                        score.categories.semanticStructure.tablePresence
                          ? "default"
                          : "outline"
                      }
                    >
                      {score.categories.semanticStructure.tablePresence
                        ? "Yes"
                        : "No"}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Schema markup found:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {score.categories.semanticStructure.schemaMarkup.length >
                      0 ? (
                        score.categories.semanticStructure.schemaMarkup.map(
                          (s, i) => (
                            <Badge key={i} variant="secondary">
                              {s}
                            </Badge>
                          )
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          None detected
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="extract">
              <Card>
                <CardHeader>
                  <CardTitle>Extractability Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between rounded border p-3">
                    <span>Direct answer statements</span>
                    <Badge>{score.categories.extractability.directAnswers}/8</Badge>
                  </div>
                  <div className="flex justify-between rounded border p-3">
                    <span>Paragraph clarity (50–150 words)</span>
                    <Badge>
                      {score.categories.extractability.paragraphClarity}/6
                    </Badge>
                  </div>
                  <div className="flex justify-between rounded border p-3">
                    <span>Bullet points</span>
                    <Badge>{score.categories.extractability.bulletPoints}</Badge>
                  </div>
                  <div className="flex justify-between rounded border p-3">
                    <span>Numbered steps</span>
                    <Badge>{score.categories.extractability.numberedSteps}</Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="entity">
              <Card>
                <CardHeader>
                  <CardTitle>Entity Density Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between rounded border p-3">
                    <span>Knowledge Graph links (sameAs)</span>
                    <Badge>
                      {score.categories.entityDensity.knowledgeGraphLinks}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Entities found:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {score.categories.entityDensity.entitiesFound.map(
                        (e, i) => (
                          <Badge key={i} variant="secondary">
                            {e}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Entity relations:</span>
                    <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                      {score.categories.entityDensity.entityRelations.map(
                        (r, i) => (
                          <li key={i}>{r}</li>
                        )
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="depth">
              <Card>
                <CardHeader>
                  <CardTitle>Contextual Depth Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between rounded border p-3">
                    <span>Word count</span>
                    <Badge>{score.categories.contextualDepth.wordCount}</Badge>
                  </div>
                  <div className="flex justify-between rounded border p-3">
                    <span>Unique concepts</span>
                    <Badge>
                      {score.categories.contextualDepth.uniqueConcepts}
                    </Badge>
                  </div>
                  <div className="flex justify-between rounded border p-3">
                    <span>Internal links</span>
                    <Badge>
                      {score.categories.contextualDepth.internalLinks}
                    </Badge>
                  </div>
                  <div className="flex justify-between rounded border p-3">
                    <span>External citations</span>
                    <Badge>
                      {score.categories.contextualDepth.externalCitations}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="multi">
              <Card>
                <CardHeader>
                  <CardTitle>Multi-Query Optimization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between rounded border p-3">
                    <span>Question–answer pairs</span>
                    <Badge>
                      {score.categories.multiQueryOptimization.questionAnswerPairs}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Query patterns covered:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {score.categories.multiQueryOptimization.queryCoverage.map(
                        (q, i) => (
                          <Badge key={i} variant="outline">
                            {q}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Related topics:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {score.categories.multiQueryOptimization.relatedTopics.map(
                        (t, i) => (
                          <Badge key={i} variant="secondary">
                            {t}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signals">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Signals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between rounded border p-3">
                    <span>llms.txt present</span>
                    <Badge
                      variant={
                        score.categories.agentSignals.llmsTxtPresent
                          ? "default"
                          : "destructive"
                      }
                    >
                      {score.categories.agentSignals.llmsTxtPresent ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between rounded border p-3">
                    <span>robots.txt AI-optimized</span>
                    <Badge
                      variant={
                        score.categories.agentSignals.robotsTxtAIOptimized
                          ? "default"
                          : "outline"
                      }
                    >
                      {score.categories.agentSignals.robotsTxtAIOptimized
                        ? "Yes"
                        : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between rounded border p-3">
                    <span>Origin signals detected</span>
                    <Badge>{score.categories.agentSignals.originSignals}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">AI crawlers in robots.txt:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {score.categories.agentSignals.agentHeaders.length > 0 ? (
                        score.categories.agentSignals.agentHeaders.map((h, i) => (
                          <Badge key={i} variant="secondary">
                            {h}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          None referenced
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
