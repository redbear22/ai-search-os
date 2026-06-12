"use client";



import { useCallback, useEffect, useRef, useState } from "react";

import Link from "next/link";

import { useRouter, useSearchParams } from "next/navigation";

import { useShallow } from "zustand/react/shallow";

import { CheckCircle2, RotateCcw, Save, Sparkles } from "lucide-react";

import { AgentAuditButton } from "@/components/audit/agent-audit-button";
import { UnifiedAuditPanel } from "@/components/audit/unified-audit-panel";

import { DiscoverabilityLayer } from "@/components/audit/discoverability-layer";

import { ClarityLayer } from "@/components/audit/clarity-layer";

import { AuthorityLayer } from "@/components/audit/authority-layer";

import { TrustLayer } from "@/components/audit/trust-layer";

import { ValidationSummary } from "@/components/audit/validation-summary";

import { FeatureGate } from "@/components/FeatureGate";

import { PlanContextBanner } from "@/components/PlanContextBanner";


import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { Input } from "@/components/ui/input";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AUDIT_LAYER_META, type AuditLayerId } from "@/lib/audit-types";

import { isAuditComplete } from "@/lib/audit-validation";

import { trackAuditCompleted } from "@/lib/analytics";


import { detectGapsRemote } from "@/lib/client/proprietary-api";

import { useAuditClarityForm } from "@/hooks/useAuditClarityForm";

import { useClarityAI } from "@/hooks/useClarityAI";

import { useAuditDbSave } from "@/hooks/useWorkflowDb";

import { useDomainCount } from "@/hooks/useDomainCount";

import { useUser } from "@/hooks/useUser";

import { hasFeature } from "@/lib/feature-flags";

import { parseAuditSearchParams } from "@/lib/audit-navigation";

import { useAuditStore } from "@/store/auditStore";

import { kpisToLegacySummary, useKPIStore } from "@/store/kpiStore";

import { useActionStore } from "@/store/actionStore";

import { useWorkspaceStore } from "@/store/workspaceStore";



export default function AuditPage() {

  const router = useRouter();
  const searchParams = useSearchParams();
  const switchClient = useWorkspaceStore((s) => s.switchClient);
  const appliedPrefillRef = useRef<string | null>(null);

  const [activeTab, setActiveTab] = useState<AuditLayerId>("discoverability");

  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [completeError, setCompleteError] = useState<string | null>(null);



  const savedBrand = useAuditStore((s) => s.auditBrandName);
  const savedDomain = useAuditStore((s) => s.auditDomain);
  const [brandName, setBrandName] = useState(savedBrand || "PickAdviser");
  const [domain, setDomain] = useState(savedDomain || "pickadviser.org");
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

  const { saveNow, saveDebounced } = useAuditDbSave();

  const { tier, isAuthenticated } = useUser();

  const { domainCount, domainLimit } = useDomainCount();

  const canCloudSave = hasFeature("cloudSave", tier);



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



  useEffect(() => {

    if (!isHydrated) return;

    const prefill = parseAuditSearchParams(searchParams);
    const prefillKey = searchParams?.toString() ?? "";
    if (!prefill.clientId && !prefill.domain && !prefill.brandName) return;
    if (appliedPrefillRef.current === prefillKey) return;
    appliedPrefillRef.current = prefillKey;

    const applyFields = (nextDomain: string | null, nextBrand: string | null) => {
      if (nextBrand) setBrandName(nextBrand);
      if (nextDomain) setDomain(nextDomain);
      useAuditStore.setState({
        auditBrandName: nextBrand ?? useAuditStore.getState().auditBrandName,
        auditDomain: nextDomain ?? useAuditStore.getState().auditDomain,
      });
    };

    if (prefill.domain || prefill.brandName) {
      applyFields(prefill.domain, prefill.brandName);
    }

    if (prefill.clientId) {
      void switchClient(prefill.clientId);
    }

    if (prefill.clientId && !prefill.domain && !prefill.brandName) {
      void fetch(`/api/agency/clients/${prefill.clientId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((client: { domain?: string | null; name?: string } | null) => {
          if (!client) return;
          applyFields(client.domain?.trim() || null, client.name?.trim() || null);
        })
        .catch(() => undefined);
    }

  }, [isHydrated, searchParams, switchClient]);



  const handleSave = useCallback(() => {

    saveProgress();

    if (canCloudSave) void saveNow();

    setSaveMessage(

      canCloudSave

        ? `Saved ${new Date().toLocaleTimeString()}`

        : `Saved locally ${new Date().toLocaleTimeString()}`

    );

    setCompleteError(null);

    setTimeout(() => setSaveMessage(null), 3000);

  }, [saveProgress, saveNow, canCloudSave]);



  const handleTabChange = useCallback(

    (value: string) => {

      setActiveTab(value as AuditLayerId);

      saveProgress();

      if (canCloudSave) saveDebounced();

      setSaveMessage(`Saved ${new Date().toLocaleTimeString()}`);

      setTimeout(() => setSaveMessage(null), 2000);

    },

    [saveProgress, saveDebounced, canCloudSave]

  );



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

    if (canCloudSave) void saveNow();

    seedKpis(auditData);

    seedActions(auditData, kpisToLegacySummary(useKPIStore.getState().kpis));

    void detectGapsRemote(auditData)

      .then((result) => trackAuditCompleted(auditData, result.count))

      .catch(() => trackAuditCompleted(auditData, 0));

    router.push("/kpis");

  }, [auditData, completeAudit, saveNow, canCloudSave, seedKpis, seedActions, router]);



  if (!isHydrated) {

    return (

      <div className="flex min-h-[50vh] items-center justify-center p-4 text-muted-foreground sm:p-8">

        Loading saved audit...

      </div>

    );

  }



  return (

    <div className="container mx-auto max-w-5xl space-y-4 p-4 animate-fade-in sm:space-y-6 sm:p-6 lg:p-8">

      {isAuthenticated && tier !== "enterprise" && domainLimit > 0 && (

        <PlanContextBanner

          currentTier={tier}

          resource="domains"

          currentUsage={domainCount}

          limit={domainLimit}

        />

      )}



      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div className="space-y-2">

          <div className="flex flex-wrap items-center gap-2">

            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">4-Layer Audit</h1>

            {isCompleted && <Badge>Completed</Badge>}

            {saveMessage && <Badge variant="secondary">{saveMessage}</Badge>}

          </div>

          <p className="max-w-xl text-sm text-muted-foreground">

            {canCloudSave

              ? "Data saves to your workspace database when signed in (local backup otherwise)."

              : "Progress saves locally in this browser. Cloud sync unlocks on Starter."}

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

            size="sm"

            className="w-full sm:w-auto"

            onClick={handleComplete}

          >

            <CheckCircle2 className="mr-2 h-4 w-4" />

            Complete Audit

          </Button>

        </div>

      </header>



      <section className="space-y-3">

        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">

          Additional capabilities

        </h2>

        <div className="grid gap-3 sm:grid-cols-2">

          <FeatureGate

            feature="cloudSave"

            title="Cloud save"

            description="Sync audit progress to your workspace database across devices."

          >

            <Button

              type="button"

              variant="secondary"

              size="sm"

              className="w-full sm:w-auto"

              onClick={handleSave}

            >

              <Save className="mr-2 h-4 w-4" />

              {canCloudSave ? "Save Progress" : "Save locally"}

            </Button>

          </FeatureGate>



          <FeatureGate

            feature="aiFixGeneration"

            title="AI gap fixes"

            description="Generate action plans and pitches from detected gaps after your audit."

          >

            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>

              <Link href="/gaps">

                <Sparkles className="mr-2 h-4 w-4" />

                Open gap fixes

              </Link>

            </Button>

          </FeatureGate>

        </div>

      </section>



      <UnifiedAuditPanel />



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



      <AgentAuditButton brandName={brandName} domain={domain} />



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

