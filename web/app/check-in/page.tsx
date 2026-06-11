"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuditStore } from "@/store/auditStore";
import { useKPIStore } from "@/store/kpiStore";
import { useActionStore } from "@/store/actionStore";
import { useCheckinStore } from "@/store/checkinStore";
import { computeShareOfVoice } from "@/lib/checkin-snapshot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function CheckinPage() {
  const kpis = useKPIStore((s) => s.kpis);
  const actions = useActionStore((s) => s.actions);
  const experiments = useCheckinStore((s) => s.experiments);
  const versions = useCheckinStore((s) => s.versions);
  const addExperiment = useCheckinStore((s) => s.addExperiment);
  const addVersion = useCheckinStore((s) => s.addVersion);

  const discoverability = useAuditStore((s) => s.discoverability);
  const clarity = useAuditStore((s) => s.clarity);
  const authority = useAuditStore((s) => s.authority);
  const trust = useAuditStore((s) => s.trust);

  const [activeTab, setActiveTab] = useState("checkin");
  const [newExperiment, setNewExperiment] = useState({
    experiment: "",
    outcome: "",
    nextStep: "",
  });
  const [checkinNotes, setCheckinNotes] = useState("");
  const [shareOfVoice, setShareOfVoice] = useState(28);

  const auditData = useMemo(
    () => ({ discoverability, clarity, authority, trust }),
    [discoverability, clarity, authority, trust]
  );

  useEffect(() => {
    void useCheckinStore.persist.rehydrate();
    void useKPIStore.persist.rehydrate();
    void useActionStore.persist.rehydrate();
    void useAuditStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const computed = computeShareOfVoice(auditData);
    if (computed > 0) setShareOfVoice(computed);
  }, [auditData]);

  const getAverageProgress = () => {
    if (kpis.length === 0) return 0;
    const total = kpis.reduce((sum, kpi) => {
      const progress =
        kpi.targetValue === 0 ? 0 : (kpi.currentValue / kpi.targetValue) * 100;
      return sum + Math.min(100, progress);
    }, 0);
    return total / kpis.length;
  };

  const evolutionData = versions
    .map((v) => ({
      version: v.versionNumber,
      date: new Date(v.createdAt).toLocaleDateString(),
      shareOfVoice: v.shareOfVoice,
      avgProgress:
        v.kpiSnapshot.reduce((sum, kpi) => {
          const progress =
            kpi.targetValue === 0 ? 0 : (kpi.currentValue / kpi.targetValue) * 100;
          return sum + Math.min(100, progress);
        }, 0) / (v.kpiSnapshot.length || 1),
    }))
    .reverse();

  const saveVersion = () => {
    const kpiSnapshot = kpis.map((kpi) => ({
      kpiId: kpi.id,
      name: kpi.name,
      layerId: kpi.layerId,
      currentValue: kpi.currentValue,
      targetValue: kpi.targetValue,
      unit: kpi.unit,
    }));

    const newVersion = {
      id: Date.now().toString(),
      versionNumber: versions.length + 1,
      kpiSnapshot,
      auditSnapshot: auditData,
      actionSnapshot: actions,
      shareOfVoice,
      createdAt: new Date().toISOString(),
      notes: checkinNotes,
    };

    addVersion(newVersion);
    setCheckinNotes("");
  };

  const addExperimentEntry = () => {
    if (!newExperiment.experiment.trim()) return;
    addExperiment({
      id: Date.now().toString(),
      ...newExperiment,
      date: new Date().toISOString().slice(0, 10),
    });
    setNewExperiment({ experiment: "", outcome: "", nextStep: "" });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Monthly Check-in</h1>
        <p className="text-muted-foreground">
          Track evolution, log experiments, and save version snapshots
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="checkin">Monthly Check-in</TabsTrigger>
          <TabsTrigger value="evolution">Evolution & Charts</TabsTrigger>
          <TabsTrigger value="experiments">Experiment Log</TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-blue-500/10 p-4 text-center">
                  <div className="text-2xl font-bold text-blue-500">{kpis.length}</div>
                  <div className="text-sm text-muted-foreground">KPIs Tracked</div>
                </div>
                <div className="rounded-lg bg-green-500/10 p-4 text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {actions.filter((a) => a.status === "completed").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Actions Completed</div>
                </div>
                <div className="rounded-lg bg-purple-500/10 p-4 text-center">
                  <div className="text-2xl font-bold text-purple-500">
                    {actions.filter((a) => a.status === "in_progress").length}
                  </div>
                  <div className="text-sm text-muted-foreground">In Progress</div>
                </div>
                <div className="rounded-lg bg-orange-500/10 p-4 text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {Math.round(getAverageProgress())}%
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Progress</div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Share of Voice (%) — AI Answers</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={shareOfVoice}
                    onChange={(e) => setShareOfVoice(parseInt(e.target.value, 10) || 0)}
                    placeholder="e.g., 28"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Estimated % of AI answers mentioning your brand vs competitors. Auto-filled
                    from audit when available.
                  </p>
                </div>
                <div>
                  <Label>Check-in Notes</Label>
                  <Textarea
                    value={checkinNotes}
                    onChange={(e) => setCheckinNotes(e.target.value)}
                    placeholder="What worked? What didn't? What changed this month?"
                    rows={4}
                  />
                </div>
                <Button onClick={saveVersion} className="w-full">
                  Save Version {versions.length + 1} Snapshot
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Update KPIs for This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Go to the <strong>KPI Dashboard</strong> to update current values before saving a
                version.
              </p>
              <Button variant="outline" asChild>
                <Link href="/kpis">Go to KPI Dashboard →</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolution" className="space-y-6">
          {evolutionData.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Share of Voice Evolution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="version" label={{ value: "Version", position: "bottom" }} />
                      <YAxis
                        label={{ value: "Share of Voice (%)", angle: -90, position: "left" }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="shareOfVoice"
                        stroke="#3b82f6"
                        name="Share of Voice"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Overall Progress Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="version" />
                      <YAxis label={{ value: "Progress (%)", angle: -90, position: "left" }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="avgProgress"
                        stroke="#22c55e"
                        name="Average KPI Progress"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Version History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[...versions].reverse().map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between rounded-lg bg-muted/40 p-3"
                      >
                        <div>
                          <Badge className="mr-2">v{v.versionNumber}</Badge>
                          <span className="text-sm">
                            {new Date(v.createdAt).toLocaleDateString()}
                          </span>
                          {v.notes && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {v.notes.substring(0, 100)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">SOV: {v.shareOfVoice}%</div>
                          <div className="text-xs text-muted-foreground">
                            {v.kpiSnapshot.length} KPIs
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No versions saved yet.</p>
                <Button className="mt-4" onClick={() => setActiveTab("checkin")}>
                  Go to Monthly Check-in to save first version
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="experiments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Log New Experiment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>What did you try?</Label>
                  <Input
                    value={newExperiment.experiment}
                    onChange={(e) =>
                      setNewExperiment({ ...newExperiment, experiment: e.target.value })
                    }
                    placeholder="e.g., Updated structured data on top 20 pages"
                  />
                </div>
                <div>
                  <Label>What was the outcome?</Label>
                  <Input
                    value={newExperiment.outcome}
                    onChange={(e) =>
                      setNewExperiment({ ...newExperiment, outcome: e.target.value })
                    }
                    placeholder="e.g., 15% increase in AI visibility score"
                  />
                </div>
                <div>
                  <Label>What&apos;s the next step?</Label>
                  <Input
                    value={newExperiment.nextStep}
                    onChange={(e) =>
                      setNewExperiment({ ...newExperiment, nextStep: e.target.value })
                    }
                    placeholder="e.g., Scale to remaining 80 pages"
                  />
                </div>
                <Button onClick={addExperimentEntry}>Log Experiment</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Experiment History</CardTitle>
            </CardHeader>
            <CardContent>
              {experiments.length > 0 ? (
                <div className="space-y-3">
                  {experiments.map((exp) => (
                    <div key={exp.id} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-start justify-between">
                        <Badge variant="outline">
                          {new Date(exp.date).toLocaleDateString()}
                        </Badge>
                      </div>
                      <p className="font-medium">{exp.experiment}</p>
                      {exp.outcome && (
                        <p className="mt-1 text-sm text-green-600">✓ Outcome: {exp.outcome}</p>
                      )}
                      {exp.nextStep && (
                        <p className="mt-1 text-sm text-blue-600">→ Next: {exp.nextStep}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  No experiments logged yet. Start tracking your learnings!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
