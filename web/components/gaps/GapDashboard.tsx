"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Copy,
  Database,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuditData } from "@/lib/audit-types";
import type { GapFix } from "@/types";
import { detectGapsRemote, generateFixRemote } from "@/lib/client/proprietary-api";
import { getGapSummary, type Gap, type GapSeverity } from "@/types/gap";
import { resolveDueWeek, truncateActionDescription } from "@/lib/gap-action";
import {
  trackFixAccepted,
  trackFixGenerated,
  trackFixRejected,
  trackGapsDetected,
} from "@/lib/analytics";
import {
  CITATION_QUEUE_CHANGED,
  PENDING_QUEUE_KEY,
  createOutreachTask,
  pushToCitationEngine,
  syncPendingOutreachTasks,
  syncPendingQueue,
} from "@/lib/citation-engine-client";
import { EmptyState } from "@/components/EmptyState";
import { TooltipWrapper } from "@/components/TooltipWrapper";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useAuditStore } from "@/store/auditStore";
import { useActionStore, type Action } from "@/store/actionStore";
import { useGapStore } from "@/store/gapStore";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/useMobile";

const severityColors: Record<GapSeverity, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-blue-500 text-white",
};

const severityIcons: Record<GapSeverity, ReactNode> = {
  critical: <AlertTriangle className="h-4 w-4 text-red-500" />,
  high: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  medium: <TrendingUp className="h-4 w-4 text-yellow-500" />,
  low: <CheckCircle className="h-4 w-4 text-blue-500" />,
};

const LAYER_TABS = ["all", "authority", "clarity", "discoverability", "trust"] as const;

function extractPublication(gap: Gap): string {
  const fromTitle = gap.title.match(/from ([\w-]+\.\w+)/)?.[1];
  if (fromTitle) return fromTitle;

  const source = gap.source?.trim();
  if (!source) return "unknown";
  if (source.includes(".")) {
    return source.replace(/^https?:\/\//, "").split("/")[0] || source;
  }
  return source;
}

function hasAuditStarted(auditData: AuditData): boolean {
  const { discoverability, clarity, authority, trust } = auditData;

  if (
    discoverability.seo.traffic > 0 ||
    discoverability.seo.keywords > 0 ||
    discoverability.aso.aiVisibilityScore > 0
  ) {
    return true;
  }

  if (
    authority.backlinksCount > 0 ||
    authority.sourcesCitingUs.length > 0 ||
    authority.sourcesCitingCompetitorsOnly.length > 0
  ) {
    return true;
  }

  if (trust.reviewCount > 0 || trust.averageRating > 0 || trust.hedgedLanguageDetected) {
    return true;
  }

  return Object.values(clarity.platforms).some(
    (p) =>
      p.responseText.trim().length > 0 ||
      p.wrongItems.length > 0 ||
      p.missingItems.length > 0
  );
}

function GapCard({
  gap,
  onGenerateAction,
  isGenerating,
  activeGapId,
}: {
  gap: Gap;
  onGenerateAction: (gap: Gap) => void;
  isGenerating: boolean;
  activeGapId: string | null;
}) {
  const { isResolved } = useGapStore();
  const loading = isGenerating && activeGapId === gap.id;
  const borderClass =
    gap.severity === "critical"
      ? "border-l-red-500"
      : gap.severity === "high"
        ? "border-l-orange-500"
        : gap.severity === "medium"
          ? "border-l-yellow-500"
          : "border-l-blue-500";

  return (
    <div
      className={cn(
        "gap-card hover-lift rounded-lg border bg-card p-4 text-card-foreground transition-all animate-fade-in border-l-4 sm:p-6",
        borderClass
      )}
    >
      <div className="min-h-[120px] flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {severityIcons[gap.severity]}
            <Badge variant="outline">{gap.layer.toUpperCase()}</Badge>
            <Badge className={severityColors[gap.severity]}>{gap.severity.toUpperCase()}</Badge>
            {isResolved(gap.id) && (
              <Badge variant="secondary">
                <CheckCircle className="mr-1 h-3 w-3" />
                Action Created
              </Badge>
            )}
          </div>
          <h3 className="mb-1 font-semibold">{gap.title}</h3>
          <p className="mb-2 text-sm text-muted-foreground">{gap.description}</p>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Suggested owner:</span> {gap.suggestedOwner}
            {" • "}
            <span className="font-medium">Timeline:</span> Week {gap.suggestedTimeline}
          </div>
        </div>
        <TooltipWrapper content="Generate an AI action plan, pitch, and metrics for this gap">
          <LoadingButton
            size="sm"
            onClick={() => onGenerateAction(gap)}
            loading={loading}
            disabled={isResolved(gap.id)}
            className="h-10 w-full shrink-0 sm:h-9 sm:w-auto"
          >
            {!loading && <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? "Generating..." : isResolved(gap.id) ? "Action Created" : "Generate Fix"}
          </LoadingButton>
        </TooltipWrapper>
      </div>
    </div>
  );
}

export function GapDashboard() {
  const isMobile = useMobile();
  const router = useRouter();
  const auditData = useAuditStore(
    useShallow((s) => ({
      discoverability: s.discoverability,
      clarity: s.clarity,
      authority: s.authority,
      trust: s.trust,
    }))
  );
  const addAction = useActionStore((s) => s.addAction);
  const markResolved = useGapStore((s) => s.markResolved);
  const isResolved = useGapStore((s) => s.isResolved);
  const [selectedGap, setSelectedGap] = useState<Gap | null>(null);
  const [generatedFix, setGeneratedFix] = useState<GapFix | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [gapsLoading, setGapsLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/citation-engine/status")
      .then((response) => response.json())
      .then((data: { pushAvailable?: boolean }) => {
        const available = data.pushAvailable === true;
        setPushConfigured(available);
        if (available) {
          void syncPendingQueue();
          void syncPendingOutreachTasks();
        }
      })
      .catch(() => {
        setPushConfigured(false);
        toastApiError();
      });
  }, []);

  useEffect(() => {
    const checkPending = () => {
      const queue = JSON.parse(localStorage.getItem(PENDING_QUEUE_KEY) || "[]");
      setPendingCount(queue.length);
    };

    checkPending();
    window.addEventListener("storage", checkPending);
    window.addEventListener(CITATION_QUEUE_CHANGED, checkPending);
    return () => {
      window.removeEventListener("storage", checkPending);
      window.removeEventListener(CITATION_QUEUE_CHANGED, checkPending);
    };
  }, []);

  const handleSync = async () => {
    if (!pushConfigured) {
      toast.error(
        "Push not configured — enable CITATION_ENGINE_ENABLED and/or AGENT_API_ENABLED in web/.env.local."
      );
      return;
    }

    setSyncing(true);
    try {
      await syncPendingQueue();
      const queue = JSON.parse(localStorage.getItem(PENDING_QUEUE_KEY) || "[]");
      setPendingCount(queue.length);
      toast.success(
        queue.length === 0
          ? "All pending items synced."
          : `${queue.length} item${queue.length === 1 ? "" : "s"} still pending.`
      );
    } finally {
      setSyncing(false);
    }
  };

  const summary = useMemo(() => getGapSummary(gaps), [gaps]);
  const auditStarted = useMemo(() => hasAuditStarted(auditData), [auditData]);

  useEffect(() => {
    if (!auditStarted) {
      setGaps([]);
      return;
    }

    let cancelled = false;
    setGapsLoading(true);

    void detectGapsRemote(auditData)
      .then((result) => {
        if (!cancelled) {
          setGaps(result.gaps);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Failed to detect gaps");
          setGaps([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setGapsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [auditData, auditStarted]);

  useEffect(() => {
    if (auditStarted && gaps.length > 0) {
      trackGapsDetected(gaps);
    }
  }, [auditStarted, gaps]);

  const handleGenerateFix = async (gap: Gap) => {
    setSelectedGap(gap);
    setIsGenerating(true);
    setGeneratedFix(null);

    try {
      const fix = await generateFixRemote({
        gap: gap.title,
        context: {
          title: gap.title,
          layer: gap.layer,
          severity: gap.severity,
          source: gap.source,
          suggestedOwner: gap.suggestedOwner,
          suggestedTimeline: gap.suggestedTimeline,
        },
      });
      setGeneratedFix(fix);
      trackFixGenerated(gap, fix.action.length);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate fix");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAction = (gap: Gap) => {
    void handleGenerateFix(gap);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Content copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const pushToEngine = async (fix: GapFix, gap: Gap) => {
    setPushing(true);

    const publication = extractPublication(gap);
    const targetUrl = gap.source?.startsWith("http")
      ? gap.source
      : publication !== "unknown"
        ? `https://${publication}`
        : undefined;

    const payload = {
      type: "pitch" as const,
      title: `Pitch: ${gap.title}`,
      body: fix.contentDraft || fix.action,
      targetUrl,
      sourceGapId: gap.id,
      metadata: {
        layer: gap.layer,
        severity: gap.severity,
        suggestedOwner: gap.suggestedOwner,
        generatedAt: new Date().toISOString(),
      },
    };

    try {
      const result = (await pushToCitationEngine(payload)) as { queued?: boolean };

      if (result?.queued) {
        toast.info(
          "Citation Engine unavailable — content saved locally and will sync automatically."
        );
      } else {
        toast.success(`Content draft created for ${publication}`);
      }

      const outreachResult = (await createOutreachTask({
        publication,
        pitch: fix.contentDraft || fix.action,
        priority:
          gap.severity === "critical" || gap.severity === "high" ? "high" : "medium",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })) as { queued?: boolean };

      if (outreachResult?.queued) {
        toast.info("Outreach task saved locally until Agent API is available.");
      }
    } catch {
      toast.error("Could not push to Citation Engine. Content may be queued locally.");
    } finally {
      setPushing(false);
    }
  };

  const addToActionPlan = async (fix: GapFix, gap: Gap) => {
    const dueWeek = resolveDueWeek(gap, fix);
    const actionId = `gap_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const newAction: Action = {
      id: actionId,
      layerId: gap.layer,
      description: truncateActionDescription(fix.action),
      ownerTeam: gap.suggestedOwner,
      ownerPerson: "",
      dueWeek,
      resourceAsks: fix.resources || [],
      status: "not_started" as const,
      createdAt: new Date().toISOString(),
    };

    addAction(newAction);
    markResolved(gap.id, actionId);
    trackFixAccepted(gap);
    // Outcome tracking: add "Did this work?" buttons and call
    // trackFixOutcome(gap.id, "worked" | "didnt_work" | "partial")

    toast.success(`"${gap.title}" added to your week ${dueWeek} action plan.`);

    await pushToEngine(fix, gap);

    setSelectedGap(null);
    setGeneratedFix(null);
    setCopied(false);
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      if (generatedFix && selectedGap && !isResolved(selectedGap.id)) {
        trackFixRejected(selectedGap);
      }
      setSelectedGap(null);
      setGeneratedFix(null);
      setIsGenerating(false);
      setPushing(false);
      setCopied(false);
    }
  };

  if (gapsLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Detecting gaps…
      </div>
    );
  }

  if (!auditStarted || gaps.length === 0) {
    return (
      <EmptyState
        title="No gaps detected yet"
        description="Run an audit to identify opportunities for improving your AI search visibility."
        actionLabel="Run Audit"
        onAction={() => router.push("/audit")}
        icon="rocket"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        {pendingCount > 0 && (
          <Badge variant="secondary">{pendingCount} pending in queue</Badge>
        )}
        {!pushConfigured && (
          <span className="text-xs text-muted-foreground">
            Push disabled — content queues locally
          </span>
        )}
        <LoadingButton
          variant="outline"
          size="sm"
          onClick={() => void handleSync()}
          loading={syncing}
          disabled={pendingCount === 0}
          className="w-full sm:w-auto"
        >
          {!syncing && <RefreshCw className="mr-2 h-4 w-4" />}
          Sync Queue
        </LoadingButton>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        {(
          [
            { label: "Total Gaps", value: summary.total, className: "" },
            { label: "Critical", value: summary.bySeverity.critical, className: "text-red-500" },
            { label: "High", value: summary.bySeverity.high, className: "text-orange-500" },
            { label: "Medium", value: summary.bySeverity.medium, className: "text-yellow-500" },
            { label: "Low", value: summary.bySeverity.low, className: "text-blue-500" },
          ] as const
        ).map((stat) => (
          <Card key={stat.label} className="hover-lift border-border/60">
            <CardContent className="p-3 pt-4 sm:p-6 sm:pt-6">
              <div className={cn("text-xl font-bold sm:text-2xl", stat.className)}>{stat.value}</div>
              <p className="text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all">
        <TabsList
          className={cn(
            "flex h-auto w-full",
            isMobile ? "grid grid-cols-2 gap-1 sm:grid-cols-3" : "overflow-x-auto"
          )}
        >
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            All ({summary.total})
          </TabsTrigger>
          <TabsTrigger value="authority" className="text-xs sm:text-sm">
            Authority ({summary.byLayer.authority})
          </TabsTrigger>
          <TabsTrigger value="clarity" className="text-xs sm:text-sm">
            Clarity ({summary.byLayer.clarity})
          </TabsTrigger>
          <TabsTrigger value="discoverability" className="text-xs sm:text-sm">
            Discoverability ({summary.byLayer.discoverability})
          </TabsTrigger>
          <TabsTrigger value="trust" className="text-xs sm:text-sm">
            Trust ({summary.byLayer.trust})
          </TabsTrigger>
        </TabsList>

        {LAYER_TABS.map((tab) => {
          const filtered = gaps.filter((g) => tab === "all" || g.layer === tab);
          return (
            <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
              {filtered.map((gap, index) => (
                <GapCard
                  key={gap.id}
                  gap={gap}
                  onGenerateAction={handleGenerateAction}
                  isGenerating={isGenerating}
                  activeGapId={selectedGap?.id ?? null}
                />
              ))}
              {filtered.length === 0 && (
                <div
                  className={cn(
                    "rounded-lg border bg-card p-8 text-center text-card-foreground shadow-sm",
                    tab === "all" && summary.total === 0 && "gap-card"
                  )}
                >
                  <CheckCircle className="mx-auto mb-2 h-12 w-12 text-green-500" />
                  <p className="text-muted-foreground">No gaps found in this layer.</p>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={!!selectedGap} onOpenChange={handleCloseDialog}>
        <DialogContent
          className={cn(
            "max-h-[85vh] overflow-y-auto",
            isMobile ? "w-[calc(100vw-2rem)] max-w-none" : "max-w-2xl"
          )}
        >
          <DialogHeader>
            <DialogTitle>Generated Fix: {selectedGap?.title}</DialogTitle>
            <DialogDescription>
              AI-generated action plan based on your specific gap
            </DialogDescription>
          </DialogHeader>

          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Generating fix...</p>
            </div>
          ) : generatedFix ? (
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold">Action Plan</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(generatedFix.action)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="whitespace-pre-wrap text-sm">{generatedFix.action}</p>
              </div>

              {generatedFix.contentDraft && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold">Content Draft / Pitch</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(generatedFix.contentDraft)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
                    {generatedFix.contentDraft}
                  </div>
                </div>
              )}

              {generatedFix.successMetrics?.length > 0 && (
                <div>
                  <h4 className="mb-2 font-semibold">Success Metrics</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {generatedFix.successMetrics.map((metric, i) => (
                      <li key={i}>{metric}</li>
                    ))}
                  </ul>
                </div>
              )}

              {generatedFix.resources?.length > 0 && (
                <div>
                  <h4 className="mb-2 font-semibold">Resources Needed</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {generatedFix.resources.map((resource, i) => (
                      <li key={i}>{resource}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Estimated effort: {generatedFix.estimatedEffort || "2-4 hours"}</p>
                  <p className="flex items-center gap-1 text-xs">
                    <Database className="h-3 w-3" />
                    {pushConfigured
                      ? "Syncs to Citation Engine (:8501) and/or Agent API (:8787)"
                      : "Queues locally until CITATION_ENGINE_ENABLED or AGENT_API_ENABLED is set"}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() =>
                      copyToClipboard(JSON.stringify(generatedFix, null, 2))
                    }
                  >
                    Export JSON
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => pushToEngine(generatedFix, selectedGap!)}
                    disabled={pushing}
                  >
                    {pushing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Database className="mr-2 h-4 w-4" />
                    )}
                    Push to Citation Engine
                  </Button>
                  {selectedGap && extractPublication(selectedGap) !== "unknown" && (
                    <Button variant="ghost" className="w-full sm:w-auto" asChild>
                      <a
                        href={`https://${extractPublication(selectedGap)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open publication"
                      >
                        <ExternalLink className="mr-2 h-4 w-4 sm:mr-0" />
                        <span className="sm:hidden">Open publication</span>
                      </a>
                    </Button>
                  )}
                  <Button
                    disabled={pushing}
                    className="w-full sm:w-auto"
                    onClick={() => selectedGap && void addToActionPlan(generatedFix, selectedGap)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Add to Action Plan
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
