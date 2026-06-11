"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Play,
  RefreshCw,
  GitBranch,
  Code,
  FileCode,
  Shield,
} from "lucide-react";

type FixPipelineRunView = {
  id: string;
  clientId: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  fixesApplied: number;
  fixesFailed: number;
  trigger: string;
  error: string | null;
};

type ClientGap = {
  id: string;
  description: string;
  category: string;
  severity: "high" | "medium" | "low";
};

export default function AutomatedFixPipelinePage() {
  const params = useParams();
  const clientId = (params?.clientId as string) ?? "";
  const { toast } = useToast();

  const [runs, setRuns] = useState<FixPipelineRunView[]>([]);
  const [pendingGaps, setPendingGaps] = useState<ClientGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [clientId]);

  const fetchData = async () => {
    try {
      const [runsRes, gapsRes] = await Promise.all([
        fetch(`/api/agency/clients/${clientId}/fixes/runs`),
        fetch(`/api/agency/clients/${clientId}/fixes/pending-gaps`),
      ]);

      if (runsRes.ok) {
        const runsData = await runsRes.json();
        setRuns(runsData);
      }

      if (gapsRes.ok) {
        const gapsData = await gapsRes.json();
        setPendingGaps(gapsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const runPipeline = async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/fixes/run`, {
        method: "POST",
      });

      if (res.ok) {
        toast({
          title: "Fix pipeline started",
          description: "The automated fix pipeline is now running.",
        });
        setTimeout(fetchData, 2000);
      } else {
        throw new Error("Failed to start pipeline");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start fix pipeline.",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Automated Fix Pipeline</h1>
          <p className="text-muted-foreground mt-2">
            Automatically generate and apply fixes for identified gaps
          </p>
        </div>
        <Button onClick={runPipeline} disabled={running}>
          {running ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Pipeline
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending Fixes</CardTitle>
            <CardDescription>Gaps ready for automated fixing</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingGaps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>No pending fixes</p>
                <p className="text-sm">All identified gaps have been addressed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingGaps.map((gap) => (
                  <div key={gap.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div>
                      <Badge variant={gap.severity === "high" ? "destructive" : "default"} className="mb-2">
                        {gap.severity}
                      </Badge>
                      <p className="text-sm">{gap.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{gap.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Runs</CardTitle>
            <CardDescription>Pipeline execution history</CardDescription>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No pipeline runs yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {runs.slice(0, 10).map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(run.status)}
                        <span className="text-sm font-medium">
                          {new Date(run.startedAt).toLocaleString()}
                        </span>
                      </div>
                      {run.status === "completed" && (
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            ✓ {run.fixesApplied} applied
                          </Badge>
                          {run.fixesFailed > 0 && (
                            <Badge variant="outline" className="text-xs text-red-500">
                              ✗ {run.fixesFailed} failed
                            </Badge>
                          )}
                        </div>
                      )}
                      {run.error && (
                        <p className="text-xs text-red-500 mt-1">{run.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>The automated fix pipeline process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <GitBranch className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <h3 className="font-medium">1. Identify</h3>
              <p className="text-sm text-muted-foreground">Detect gaps from audit results</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Code className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <h3 className="font-medium">2. Generate</h3>
              <p className="text-sm text-muted-foreground">AI generates fix code</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Shield className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <h3 className="font-medium">3. Apply</h3>
              <p className="text-sm text-muted-foreground">Automatically apply fixes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}