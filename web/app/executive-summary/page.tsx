"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuditStore } from "@/store/auditStore";
import { useKPIStore } from "@/store/kpiStore";
import { useActionStore } from "@/store/actionStore";
import { useSummaryStore } from "@/store/summaryStore";
import { generateSummaryDraft } from "@/lib/generate-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const layerNames = {
  discoverability: "Discoverability",
  clarity: "Clarity",
  authority: "Authority",
  trust: "Trust",
};

function getProgress(current: number, target: number) {
  if (target === 0) return 0;
  return Math.min(100, (current / target) * 100);
}

export default function ExecutiveSummaryPage() {
  const kpis = useKPIStore((s) => s.kpis);
  const actions = useActionStore((s) => s.actions);
  const versions = useSummaryStore((s) => s.versions);
  const currentVersionId = useSummaryStore((s) => s.currentVersionId);
  const addVersion = useSummaryStore((s) => s.addVersion);
  const setCurrentVersion = useSummaryStore((s) => s.setCurrentVersion);

  const isCompleted = useAuditStore((s) => s.isCompleted);
  const discoverability = useAuditStore((s) => s.discoverability);
  const clarity = useAuditStore((s) => s.clarity);
  const authority = useAuditStore((s) => s.authority);
  const trust = useAuditStore((s) => s.trust);

  const [hydrated, setHydrated] = useState(false);
  const [opportunity, setOpportunity] = useState("");
  const [riskOfInaction, setRiskOfInaction] = useState("");
  const [resourceAskSummary, setResourceAskSummary] = useState("");
  const [editing, setEditing] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  useEffect(() => {
    const done = () => setHydrated(true);
    const unsubs = [
      useAuditStore.persist.onFinishHydration(done),
      useKPIStore.persist.onFinishHydration(done),
      useActionStore.persist.onFinishHydration(done),
      useSummaryStore.persist.onFinishHydration(done),
    ];
    void useAuditStore.persist.rehydrate();
    void useKPIStore.persist.rehydrate();
    void useActionStore.persist.rehydrate();
    void useSummaryStore.persist.rehydrate();
    if (
      useAuditStore.persist.hasHydrated() &&
      useKPIStore.persist.hasHydrated() &&
      useActionStore.persist.hasHydrated() &&
      useSummaryStore.persist.hasHydrated()
    ) {
      setHydrated(true);
    }
    return () => unsubs.forEach((u) => u());
  }, []);

  const auditData = useMemo(
    () => (isCompleted ? { discoverability, clarity, authority, trust } : null),
    [isCompleted, discoverability, clarity, authority, trust]
  );

  const currentVersion = versions.find((v) => v.id === currentVersionId);

  useEffect(() => {
    if (!hydrated || autoFilled) return;

    if (currentVersion) {
      setOpportunity(currentVersion.opportunity);
      setRiskOfInaction(currentVersion.riskOfInaction);
      setResourceAskSummary(currentVersion.resourceAskSummary);
      setAutoFilled(true);
      return;
    }

    const draft = generateSummaryDraft(kpis, actions, auditData, versions.length + 1);
    setOpportunity(draft.opportunity);
    setRiskOfInaction(draft.riskOfInaction);
    setResourceAskSummary(draft.resourceAskSummary);
    setAutoFilled(true);
  }, [hydrated, autoFilled, currentVersion, kpis, actions, auditData, versions.length]);

  useEffect(() => {
    if (!currentVersion) return;
    setOpportunity(currentVersion.opportunity);
    setRiskOfInaction(currentVersion.riskOfInaction);
    setResourceAskSummary(currentVersion.resourceAskSummary);
    setEditing(false);
  }, [currentVersionId, currentVersion]);

  const topActions = [...actions].sort((a, b) => a.dueWeek - b.dueWeek).slice(0, 3);

  const saveVersion = () => {
    addVersion({
      version: versions.length + 1,
      opportunity,
      riskOfInaction,
      resourceAskSummary,
      createdAt: new Date().toISOString(),
    });
    useKPIStore.getState().exportToExecutiveSummary();
    setEditing(false);
  };

  const regenerateDraft = () => {
    const draft = generateSummaryDraft(kpis, actions, auditData, versions.length + 1);
    setOpportunity(draft.opportunity);
    setRiskOfInaction(draft.riskOfInaction);
    setResourceAskSummary(draft.resourceAskSummary);
    setEditing(true);
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Loading executive summary...
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 print:py-4">
      <div className="mb-8 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Executive Summary</h1>
          <p className="text-muted-foreground">Leadership-ready one-pager for CMO/CEO</p>
        </div>
        <div className="space-x-2">
          {!editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button variant="outline" onClick={regenerateDraft}>
                Regenerate
              </Button>
              <Button onClick={saveVersion}>Save Version</Button>
              <Button variant="secondary" onClick={() => window.print()}>
                Export to PDF
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={saveVersion}>Save Version</Button>
            </>
          )}
        </div>
      </div>

      {versions.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
          <span className="text-sm text-muted-foreground">Versions:</span>
          {versions.map((v) => (
            <Badge
              key={v.id}
              variant={currentVersionId === v.id ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCurrentVersion(v.id)}
            >
              v{v.version} - {new Date(v.createdAt).toLocaleDateString()}
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-6">
        <Card className="print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle>Executive Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold">Opportunity</h3>
              {editing ? (
                <Textarea
                  value={opportunity}
                  onChange={(e) => setOpportunity(e.target.value)}
                  placeholder="What's the opportunity for the business?"
                  className="min-h-[100px]"
                />
              ) : (
                <p className="text-muted-foreground">
                  {opportunity || "Complete audit to generate opportunity statement"}
                </p>
              )}
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Risk of Inaction</h3>
              {editing ? (
                <Textarea
                  value={riskOfInaction}
                  onChange={(e) => setRiskOfInaction(e.target.value)}
                  placeholder="What happens if we don't act?"
                  className="min-h-[100px]"
                />
              ) : (
                <p className="text-muted-foreground">
                  {riskOfInaction || "Complete audit to identify risks"}
                </p>
              )}
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Resource Ask Summary</h3>
              {editing ? (
                <Input
                  value={resourceAskSummary}
                  onChange={(e) => setResourceAskSummary(e.target.value)}
                  placeholder="e.g., $120k over 90 days, 0.5 FTE"
                />
              ) : (
                <p className="text-muted-foreground">
                  {resourceAskSummary || "Add actions with resource asks"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle>KPI Dashboard Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Layer</th>
                  <th className="py-2 text-left">KPI</th>
                  <th className="py-2 text-left">Current</th>
                  <th className="py-2 text-left">Target</th>
                  <th className="py-2 text-left">Progress</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((kpi) => (
                  <tr key={kpi.id} className="border-b">
                    <td className="py-2">{layerNames[kpi.layerId]}</td>
                    <td className="py-2">{kpi.name}</td>
                    <td className="py-2">
                      {kpi.currentValue} {kpi.unit}
                    </td>
                    <td className="py-2">
                      {kpi.targetValue} {kpi.unit}
                    </td>
                    <td className="w-32 py-2">
                      <Progress
                        value={getProgress(kpi.currentValue, kpi.targetValue)}
                        className="h-2"
                      />
                      <span className="text-xs">
                        {Math.round(getProgress(kpi.currentValue, kpi.targetValue))}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle>Top 3 Priority Actions (Next 90 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start gap-3 rounded-lg bg-muted/40 p-3"
                >
                  <Badge variant="outline" className="mt-0.5">
                    Week {action.dueWeek}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{action.description}</p>
                    <p className="text-sm text-muted-foreground">
                      Owner: {action.ownerTeam} / {action.ownerPerson || "TBD"}
                    </p>
                    {action.resourceAsks.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Resources: {action.resourceAsks.join(", ")}
                      </p>
                    )}
                  </div>
                  <Badge>{action.status.replace("_", " ")}</Badge>
                </div>
              ))}
              {topActions.length === 0 && (
                <p className="text-muted-foreground">Add actions in the Action Plan page</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="border-t pt-4 text-center text-sm text-muted-foreground">
          <p>AI Search OS — Living Document</p>
          <p>Next review: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
