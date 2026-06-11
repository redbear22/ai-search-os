"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { CheckCircle2, RotateCcw, Save } from "lucide-react";
import { UnifiedAuditPanel } from "@/components/audit/unified-audit-panel";
import { DiscoverabilityLayer } from "@/components/audit/discoverability-layer";
import { ClarityLayer } from "@/components/audit/clarity-layer";
import { AuthorityLayer } from "@/components/audit/authority-layer";
import { TrustLayer } from "@/components/audit/trust-layer";
import { ValidationSummary } from "@/components/audit/validation-summary";
import { TooltipWrapper } from "@/components/TooltipWrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AUDIT_LAYER_META, type AuditLayerId } from "@/lib/audit-types";
import { isAuditComplete } from "@/lib/audit-validation";
import { trackAuditCompleted } from "@/lib/analytics";
import { trackAuditStart } from "@/lib/google-analytics";
import { detectGapsRemote } from "@/lib/client/proprietary-api";
import { useAuditClarityForm } from "@/hooks/useAuditClarityForm";
import { useClarityAI } from "@/hooks/useClarityAI";
import { useAuditStore } from "@/store/auditStore";
import { kpisToLegacySummary, useKPIStore } from "@/store/kpiStore";
import { useActionStore } from "@/store/actionStore";

export default function AuditPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AuditLayerId>("discoverability");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Brand input state for onboarding and unified audit
  const [brandName, setBrandName] = useState("");
  const [domain, setDomain] = useState("");
  const [competitors, setCompetitors] = useState("");

  const isHydrated = useAuditStore((s) => s.isHydrated);
  const lastSavedAt = useAuditStore((s) => s.lastSavedAt);
  const isCompleted = useAuditStore((s) => s.isCompleted);
  const saveProgress = useAuditStore((s) => s.saveProgress);
  const completeAudit = useAuditStore((s) => s.completeAudit);
  const resetToMock = useAuditStore((s) => s.resetToMock);
  const seedKpis = useKPIStore((s) => s.seedFromAudit);
  const seedActions = useActionStore((s) => s.seedFromAudit);

  const clarityForm = useAuditClarityForm();
  const clarityAI = useClarityAI(clarityForm);

  const auditData = useAuditStore(
    useShallow((s) => ({
      discoverability: s.discoverability,
      clarity: s.clarity,
      authority: s.authority,
      trust: s.trust,
    }))
  );

  useEffect(() => {
    const unsub = useAuditStore.persist.onFinishHydration(() => {
      useAuditStore.getState().setHydrated();
    });
    void useAuditStore.persist.rehydrate();
    return unsub;
  }, []);

  const handleSave = useCallback(() => {
    saveProgress();
    setSaveMessage(`Saved ${new Date().toLocaleTimeString()}`);
    setCompleteError(null);
    setTimeout(() => setSaveMessage(null), 3000);
  }, [saveProgress]);

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value as AuditLayerId);
      saveProgress();
      setSaveMessage(`Saved ${new Date().toLocaleTimeString()}`);
      setTimeout(() => setSaveMessage(null), 2000);
    },
    [saveProgress]
  );

  const runAudit = useCallback(() => {
    trackAuditStart();
    // This will connect to your unified audit client
    console.log("Running unified audit for:", { brandName, domain, competitors });
    // TODO: Call runUnifiedAudit() when ready
  }, [brandName, domain, competitors]);

  const handleComplete = useCallback(() => {
    if (!isAuditComplete(auditData)) {
      setCompleteError("Complete all four layers before finishing the audit.");
      return;
    }
    const ok = completeAudit();
    if (!ok) {
      setCompleteError("Validation failed — check each tab.");
      return;
    }
    seedKpis(auditData);
    seedActions(auditData, kpisToLegacySummary(useKPIStore.getState().kpis));
    void detectGapsRemote(auditData)
      .then((result) => trackAuditCompleted(auditData, result.count))
      .catch(() => trackAuditCompleted(auditData, 0));
    router.push("/kpis");
  }, [auditData, completeAudit, seedKpis, seedActions, router]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4 text-muted-foreground sm:p-8">
        Loading saved audit...
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-4 p-4 animate-fade-in sm:space-y-6 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">4-Layer Audit</h1>
            {isCompleted && <Badge>Completed</Badge>}
            {saveMessage && <Badge variant="secondary">{saveMessage}</Badge>}
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Data auto-saves to local storage. Save on tab change or use Save Progress.
            {lastSavedAt && (
              <> Last saved: {new Date(lastSavedAt).toLocaleString()}.</>
            )}
          </p>
          {completeError && (
            <p className="text-sm text-red-400">{completeError}</p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={resetToMock}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Load mock
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleSave}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Progress
          </Button>
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleComplete}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Complete Audit
          </Button>
        </div>
      </header>

      <UnifiedAuditPanel />

      {/* ============================================================ */}
      {/* BRAND INPUT SECTION - For Onboarding Tour and Unified Audit */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <Input
          id="brand-name-input"
          placeholder="Brand Name (e.g., PickAdviser)"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
        />
        <Input
          id="domain-input"
          placeholder="Domain (e.g., pickadviser.org)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <Input
          id="competitors-input"
          placeholder="Competitors (comma-separated)"
          value={competitors}
          onChange={(e) => setCompetitors(e.target.value)}
        />
      </div>

      <TooltipWrapper content="Run a full audit across all 4 layers">
        <Button onClick={runAudit} className="w-full sm:w-auto">
          Run Audit
        </Button>
      </TooltipWrapper>

      <ValidationSummary />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4 overflow-x-auto">
          {AUDIT_LAYER_META.map((layer) => (
            <TabsTrigger
              key={layer.id}
              value={layer.id}
              className="text-xs sm:text-sm"
            >
              {layer.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {AUDIT_LAYER_META.map((layer) => (
          <TabsContent key={layer.id} value={layer.id} className="space-y-2">
            <p className="text-sm text-muted-foreground">{layer.desc}</p>
            {layer.id === "discoverability" && <DiscoverabilityLayer />}
            {layer.id === "clarity" && <ClarityLayer clarityAI={clarityAI} />}
            {layer.id === "authority" && <AuthorityLayer />}
            {layer.id === "trust" && <TrustLayer />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}