"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NetworkInsight } from "@/types/competitive-intelligence-network";

function confidenceBadge(confidence: number) {
  const pct = Math.round(confidence * 100);
  if (pct >= 75) return "default";
  if (pct >= 50) return "secondary";
  return "outline";
}

export function NetworkInsightsCards({ insights }: { insights: NetworkInsight[] }) {
  if (insights.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No network insights yet. Add more clients and run audits to strengthen benchmarks.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {insights.map((insight) => (
        <Card key={insight.id}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {insight.category.replace("_", " ")}
              </Badge>
              <Badge variant={confidenceBadge(insight.confidence)}>
                {Math.round(insight.confidence * 100)}% confidence
              </Badge>
              {insight.label ? (
                <Badge variant="secondary">{insight.label}</Badge>
              ) : null}
            </div>
            <CardTitle className="text-base leading-snug">{insight.headline}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{insight.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
