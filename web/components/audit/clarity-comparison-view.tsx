"use client";

import { useCallback, useMemo, useState } from "react";
import { Download, GitCompare, LayoutGrid, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { AIPlatform } from "@/lib/audit-types";
import {
  buildPlatformComparisons,
  confidenceLabel,
  confidenceTone,
  CLARITY_PLATFORMS,
  exportComparisonPdf,
  type PlatformComparison,
} from "@/lib/clarity-comparison";
import { useAuditStore } from "@/store/auditStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedProgress } from "@/components/AnimatedProgress";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  high: "border-green-500/40 bg-green-500/5",
  moderate: "border-amber-500/40 bg-amber-500/5",
  low: "border-red-500/40 bg-red-500/5",
  pending: "border-muted",
} as const;

const TONE_BADGE: Record<ReturnType<typeof confidenceTone>, "default" | "secondary" | "destructive" | "outline"> = {
  high: "default",
  moderate: "secondary",
  low: "destructive",
  pending: "outline",
};

function MissedConsensusHighlight({ row }: { row: PlatformComparison }) {
  if (!row.missingVsPeers.length && !row.missedKeywords.length) return null;

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 space-y-2">
      <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
        Missed vs consensus
      </p>
      {row.missingVsPeers.slice(0, 3).map((item) => (
        <p key={item} className="text-xs leading-relaxed text-amber-900 dark:text-amber-100">
          {item.split(/\s+/).map((word, i) => {
            const kw = row.missedKeywords.some(
              (k) => word.toLowerCase().includes(k) || k.includes(word.toLowerCase())
            );
            return (
              <span
                key={`${item}-${i}`}
                className={cn(kw && "bg-amber-400/40 font-medium px-0.5 rounded")}
              >
                {word}{" "}
              </span>
            );
          })}
        </p>
      ))}
      {row.missedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {row.missedKeywords.map((kw) => (
            <span
              key={kw}
              className="rounded bg-amber-400/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ComparisonCard({ row }: { row: PlatformComparison }) {
  const tone = confidenceTone(row.confidence);
  const hasIssues = row.wrongItems.length > 0 || row.missingVsPeers.length > 0;

  return (
    <Card
      className={cn(
        "flex h-full flex-col",
        TONE_STYLES[tone],
        hasIssues && tone === "high" && "border-amber-500/30"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{row.label}</CardTitle>
          <Badge variant={TONE_BADGE[tone]}>
            {row.confidence !== null ? `${row.confidence}%` : "—"}
          </Badge>
        </div>
        <CardDescription>
          Confidence: {confidenceLabel(row.confidence)}
          {row.confidence !== null && (
            <div className="mt-2">
              <AnimatedProgress value={row.confidence} />
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        <div className="min-h-[7rem] flex-1 rounded-md border bg-background/80 p-3">
          {row.responseText ? (
            <p className="whitespace-pre-wrap text-foreground leading-relaxed">
              {row.responseText}
            </p>
          ) : (
            <p className="text-muted-foreground italic">
              No response yet — query this platform or paste a response in Platform audit.
            </p>
          )}
        </div>

        <MissedConsensusHighlight row={row} />

        {row.correctItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-green-700">Consensus matches (3+ platforms)</p>
            <div className="flex flex-wrap gap-1">
              {row.correctItems.slice(0, 4).map((item) => (
                <Badge
                  key={item}
                  variant="outline"
                  className="border-green-500/50 bg-green-500/10 font-normal text-green-900 dark:text-green-200"
                >
                  {item.length > 48 ? `${item.slice(0, 45)}…` : item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {row.wrongItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-red-600">Wrong / contradicts consensus</p>
            <div className="flex flex-wrap gap-1">
              {row.wrongItems.map((item) => (
                <Badge key={item} variant="destructive" className="font-normal">
                  {item.length > 48 ? `${item.slice(0, 45)}…` : item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {row.uniqueCorrect.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Unique to this platform</p>
            <div className="flex flex-wrap gap-1">
              {row.uniqueCorrect.map((item) => (
                <Badge key={item} variant="secondary" className="font-normal">
                  {item.length > 40 ? `${item.slice(0, 37)}…` : item}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ClarityComparisonView({
  brand,
  onQueryAll,
  getResponse,
  getLoading,
}: {
  brand: string;
  onQueryAll: (brandName: string) => Promise<void>;
  getResponse: (platform: string) => string;
  getLoading: (platform: string) => boolean;
}) {
  const clarity = useAuditStore((s) => s.clarity);
  const runClarityComparison = useAuditStore((s) => s.runClarityComparison);
  const [exporting, setExporting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const anyLoading = CLARITY_PLATFORMS.some((p) => getLoading(p));

  const liveResponses = useMemo(() => {
    const out = {} as Partial<Record<AIPlatform, string>>;
    for (const p of CLARITY_PLATFORMS) {
      const live = getResponse(p);
      if (live) out[p] = live;
    }
    return out;
  }, [getResponse]);

  const comparisons = useMemo(
    () => buildPlatformComparisons(clarity, liveResponses),
    [clarity, liveResponses]
  );

  const filledCount = comparisons.filter((c) => c.responseText).length;
  const consensus = clarity.comparison?.consensusCorrect ?? [];
  const analyzedAt = clarity.comparison?.analyzedAt;

  const handleAnalyze = useCallback(() => {
    setAnalyzing(true);
    const ok = runClarityComparison();
    setAnalyzing(false);
    if (ok) {
      toast.success("Comparison complete — results saved to audit");
    } else {
      toast.error("Need at least 2 platform responses to compare");
    }
  }, [runClarityComparison]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportComparisonPdf(brand.trim(), comparisons);
      toast.success("Comparison exported as PDF");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleQueryAndCompare = async () => {
    await onQueryAll(brand.trim());
    const ok = runClarityComparison();
    if (ok) toast.success("Responses fetched and compared");
    else toast.warning("Responses saved — need 2+ platforms to compare");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LayoutGrid className="h-4 w-4" />
          <span>
            Side-by-side AI comparison — {filledCount}/4 platforms have responses
            {analyzedAt && (
              <> · analyzed {new Date(analyzedAt).toLocaleString()}</>
            )}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleQueryAndCompare}
            disabled={anyLoading || !brand.trim()}
          >
            {anyLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Query & compare
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAnalyze}
            disabled={analyzing || filledCount < 2}
          >
            {analyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GitCompare className="mr-2 h-4 w-4" />
            )}
            Compare responses
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleExport}
            disabled={exporting || filledCount === 0}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export comparison
          </Button>
        </div>
      </div>

      {consensus.length > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-green-800 dark:text-green-200">
              Consensus facts (3+ platforms agree)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <ul className="space-y-1 text-xs text-green-900 dark:text-green-100">
              {consensus.slice(0, 5).map((fact) => (
                <li key={fact}>• {fact}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {comparisons.map((row) => (
          <ComparisonCard key={row.platform} row={row} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Comparison uses keyword overlap across responses: correct = 3+ platform consensus you
        matched; missing = consensus facts you omitted; wrong = lone claims that contradict
        the group. Click Compare responses after querying all platforms.
      </p>
    </div>
  );
}
