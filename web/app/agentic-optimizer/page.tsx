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
import { Bot, Sparkles } from "lucide-react";
import type { EvolutionStrategy } from "@/lib/agentic-optimization";
import { useActionStore } from "@/store/actionStore";

const actionTypeLabels: Record<string, string> = {
  content_update: "Content Update",
  citation_build: "Citation Build",
  schema_add: "Schema Add",
  entity_link: "Entity Link",
};

function fitnessColor(score: number): string {
  if (score >= 0.8) return "text-emerald-500";
  if (score >= 0.6) return "text-blue-500";
  if (score >= 0.4) return "text-yellow-500";
  return "text-red-500";
}

export default function AgenticOptimizerPage() {
  const addAction = useActionStore((s) => s.addAction);
  const [domain, setDomain] = useState("");
  const [mentionRate, setMentionRate] = useState("25");
  const [citationCount, setCitationCount] = useState("5");
  const [shareOfVoice, setShareOfVoice] = useState("30");
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState<EvolutionStrategy[]>([]);

  const evolve = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/agentic-optimizer/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domain.trim(),
          metrics: {
            brandMentionRate: { percentage: Number(mentionRate) || 0 },
            citationDensity: { yourCitations: Number(citationCount) || 0 },
            shareOfVoice: { brand: Number(shareOfVoice) || 0 },
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStrategies(data.strategies as EvolutionStrategy[]);
        toast.success("Evolution strategies generated");
      } else {
        toast.error(data.error || "Optimization failed");
      }
    } catch {
      toast.error("Failed to generate strategies");
    } finally {
      setLoading(false);
    }
  };

  const addToPlan = (strategy: EvolutionStrategy) => {
    const actions = strategy.actions
      .map((a) => `${actionTypeLabels[a.type] ?? a.type}: ${a.target}`)
      .join("; ");

    addAction({
      id: `agentic-${strategy.id}`,
      layerId: "authority",
      description: `${strategy.name} — ${actions}`,
      ownerTeam: "SEO / Content",
      ownerPerson: "",
      dueWeek: strategy.performance.fitnessScore >= 0.7 ? 2 : 4,
      resourceAsks: [`Gen ${strategy.generation}`, `Fitness ${strategy.performance.fitnessScore}`],
      status: "not_started",
      createdAt: new Date().toISOString(),
    });
    toast.success("Added to Action Plan");
  };

  return (
    <div className="container mx-auto space-y-4 p-4 animate-fade-in sm:space-y-6 sm:p-6 sm:py-8">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl md:text-3xl">
          <Bot className="h-7 w-7 text-primary" />
          Agentic Optimizer
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          MAP-Elites evolution engine for citation, schema, and content strategy recommendations
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Label>Domain (optional)</Label>
              <Input
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && evolve()}
              />
            </div>
            <div>
              <Label>Mention rate %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={mentionRate}
                onChange={(e) => setMentionRate(e.target.value)}
              />
            </div>
            <div>
              <Label>Citations</Label>
              <Input
                type="number"
                min={0}
                value={citationCount}
                onChange={(e) => setCitationCount(e.target.value)}
              />
            </div>
            <div>
              <Label>Share of voice %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={shareOfVoice}
                onChange={(e) => setShareOfVoice(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <LoadingButton onClick={evolve} loading={loading}>
              <Sparkles className="mr-2 h-4 w-4" />
              {loading ? "Evolving…" : "Evolve Strategies"}
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      {strategies.length > 0 && (
        <div className="space-y-4">
          {strategies.map((strategy) => (
            <Card key={strategy.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{strategy.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Generation {strategy.generation} ·{" "}
                    {strategy.actions.length} action
                    {strategy.actions.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-2xl font-bold ${fitnessColor(strategy.performance.fitnessScore)}`}
                  >
                    {Math.round(strategy.performance.fitnessScore * 100)}%
                  </span>
                  <p className="text-xs text-muted-foreground">Fitness</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress
                  value={strategy.performance.fitnessScore * 100}
                  className="h-2"
                />
                <div className="grid gap-2 sm:grid-cols-3 text-sm text-muted-foreground">
                  <span>Mention: {strategy.performance.mentionRate}%</span>
                  <span>Citations: {strategy.performance.citationCount}</span>
                  <span>SoV: {strategy.performance.shareOfVoice}%</span>
                </div>
                <ul className="space-y-2">
                  {strategy.actions.map((action, i) => (
                    <li
                      key={`${strategy.id}-${i}`}
                      className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm"
                    >
                      <Badge variant="outline">
                        {actionTypeLabels[action.type] ?? action.type}
                      </Badge>
                      <span className="font-medium">{action.target}</span>
                      {typeof action.parameters.intensity === "number" && (
                        <Badge variant="secondary">
                          intensity {Math.round(action.parameters.intensity * 100)}%
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" onClick={() => addToPlan(strategy)}>
                  Add to Plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
