"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw } from "lucide-react";

type ClientHealthDashboard = {
  overall: number;
  categories: {
    seo: number;
    performance: number;
    accessibility: number;
    security: number;
    content: number;
  };
  issues: {
    critical: number;
    warning: number;
    info: number;
  };
  recentTrend: Array<{ date: string; score: number }>;
};

function healthColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
}

export default function ClientHealthPage() {
  const params = useParams();
  const clientId = (params?.clientId as string) ?? "";
  const [data, setData] = useState<ClientHealthDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, [clientId]);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/health`);
      if (res.ok) {
        const healthData = await res.json();
        setData(healthData);
      }
    } catch (error) {
      console.error("Failed to fetch health data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No health data available</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Client Health Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Real-time health monitoring and performance metrics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Overall Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              <span className={healthColor(data.overall)}>{data.overall}%</span>
            </div>
            <Progress value={data.overall} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issues Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-red-500">Critical</span>
                <span className="font-bold">{data.issues.critical}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-500">Warnings</span>
                <span className="font-bold">{data.issues.warning}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-500">Info</span>
                <span className="font-bold">{data.issues.info}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Scores</CardTitle>
          <CardDescription>Performance breakdown by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.categories).map(([category, score]) => (
              <div key={category}>
                <div className="flex justify-between mb-1">
                  <span className="capitalize">{category}</span>
                  <Badge variant="outline">{score}%</Badge>
                </div>
                <Progress value={score} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Health Trend</CardTitle>
          <CardDescription>Last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end gap-2">
            {data.recentTrend.map((point, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-primary rounded-t"
                  style={{ height: `${point.score}%`, maxHeight: "200px", minHeight: "20px" }}
                />
                <span className="text-xs text-muted-foreground">
                  {new Date(point.date).toLocaleDateString(undefined, { weekday: "short" })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}