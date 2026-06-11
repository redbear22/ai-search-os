"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Shield,
  Eye,
  FileText,
} from "lucide-react";

const TRIGGER_LABELS: Record<string, string> = {
  schedule: "Scheduled",
  api: "API Call",
  manual: "Manual",
  webhook: "Webhook",
};

export default function AutonomousAuditPage() {
  const params = useParams();
  const clientId = (params?.clientId as string) ?? "";
  const { data: session } = useSession();
  const { toast } = useToast();
  const canManage = session?.user?.agencyRole === "ADMIN" || session?.user?.agencyRole === "OWNER";

  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [nextRun, setNextRun] = useState<Date | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    fetchHistory();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [clientId]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/autonomous/status`);
      if (res.ok) {
        const data = await res.json();
        setIsRunning(data.isRunning);
        setLastRun(data.lastRun ? new Date(data.lastRun) : null);
        setNextRun(data.nextRun ? new Date(data.nextRun) : null);
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/autonomous/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutonomous = async () => {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/autonomous/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !isRunning }),
      });

      if (res.ok) {
        setIsRunning(!isRunning);
        toast({
          title: isRunning ? "Autonomous audits stopped" : "Autonomous audits started",
          description: isRunning
            ? "No further automatic audits will be triggered."
            : "The system will now automatically audit this client.",
        });
        fetchStatus();
      } else {
        throw new Error("Failed to toggle");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change autonomous audit status.",
        variant: "destructive",
      });
    }
  };

  const triggerNow = async () => {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/autonomous/trigger`, {
        method: "POST",
      });

      if (res.ok) {
        toast({
          title: "Audit triggered",
          description: "An audit has been queued and will run shortly.",
        });
        setTimeout(() => {
          fetchStatus();
          fetchHistory();
        }, 2000);
      } else {
        throw new Error("Failed to trigger");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger audit.",
        variant: "destructive",
      });
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
          <h1 className="text-3xl font-bold">Autonomous Audits</h1>
          <p className="text-muted-foreground mt-2">
            Automated audit scheduling and execution for this client
          </p>
        </div>
        {canManage && (
          <Button onClick={toggleAutonomous} variant={isRunning ? "destructive" : "default"}>
            {isRunning ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Stop Autonomous Audits
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Autonomous Audits
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Current autonomous audit status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isRunning ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-500">Active</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-500">Inactive</span>
                </>
              )}
            </div>
            {lastRun && (
              <p className="text-sm text-muted-foreground mt-4">
                Last run: {lastRun.toLocaleString()}
              </p>
            )}
            {nextRun && isRunning && (
              <p className="text-sm text-muted-foreground">
                Next run: {nextRun.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual Trigger</CardTitle>
            <CardDescription>Run an audit immediately</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={triggerNow} variant="outline" className="w-full">
              <Play className="mr-2 h-4 w-4" />
              Trigger Audit Now
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Automatic audit schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Daily automated audit</span>
                <Badge variant={isRunning ? "default" : "secondary"}>
                  {isRunning ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <Progress value={isRunning ? 100 : 0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Audits run automatically at 2 AM daily when enabled
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit History</CardTitle>
          <CardDescription>Recent autonomous audit runs</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No audit history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {run.status === "completed" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : run.status === "failed" ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
                      )}
                      <span className="font-medium">
                        {new Date(run.startedAt).toLocaleString()}
                      </span>
                      <Badge variant="outline">{TRIGGER_LABELS[run.trigger] || run.trigger}</Badge>
                    </div>
                    {run.completedAt && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Duration: {Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)} seconds
                      </p>
                    )}
                    {run.error && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{run.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/agency/clients/${clientId}/audit/${run.auditId}`, "_blank")}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}