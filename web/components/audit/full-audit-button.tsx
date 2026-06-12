"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { TooltipWrapper } from "@/components/TooltipWrapper";
import { Button } from "@/components/ui/button";
import { mapUnifiedAuditToAuditData } from "@/lib/map-unified-audit";
import { filterRealCompetitors } from "@/lib/audit-gap-heuristics";
import type { AuditLayerId } from "@/lib/audit-types";
import type { UnifiedAuditResult } from "@/lib/unified-audit-types";
import { useAuditStore } from "@/store/auditStore";

interface LayerStatus {
  discoverability: "pending" | "loading" | "success" | "error";
  clarity: "pending" | "loading" | "success" | "error";
  authority: "pending" | "loading" | "success" | "error";
  trust: "pending" | "loading" | "success" | "error";
}

const LAYER_LABELS: Record<AuditLayerId, string> = {
  discoverability: "Discoverability",
  clarity: "Clarity",
  authority: "Authority",
  trust: "Trust",
};

function layerResultStatus(results: UnifiedAuditResult, layer: AuditLayerId): LayerStatus["discoverability"] {
  if (layer === "discoverability") {
    const d = results.discoverability;
    return d.keywords || d.rankings || d.trends ? "success" : "error";
  }
  if (layer === "clarity") return results.clarity ? "success" : "error";
  if (layer === "authority") return results.authority ? "success" : "error";
  return results.trust ? "success" : "error";
}

function StatusIcon({ status }: { status: LayerStatus[AuditLayerId] }) {
  if (status === "loading") return <Loader2 className="inline h-3 w-3 animate-spin" />;
  if (status === "success") return <CheckCircle className="inline h-3 w-3 text-green-500" />;
  if (status === "error") return <AlertCircle className="inline h-3 w-3 text-red-500" />;
  return null;
}

export function FullAuditButton({
  brandName,
  domain,
  competitors,
}: {
  brandName: string;
  domain: string;
  competitors: string[];
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<LayerStatus>({
    discoverability: "pending",
    clarity: "pending",
    authority: "pending",
    trust: "pending",
  });

  const applyUnifiedAudit = useAuditStore((s) => s.applyUnifiedAudit);

  const runAudit = async () => {
    if (!brandName.trim() || !domain.trim()) {
      toast.error("Brand name and domain are required");
      return;
    }

    setIsRunning(true);
    setStatus({
      discoverability: "loading",
      clarity: "loading",
      authority: "loading",
      trust: "loading",
    });

    try {
      const realCompetitors = filterRealCompetitors(competitors);
      const res = await fetch("/api/audit/unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          domain: domain.trim(),
          competitors: realCompetitors,
        }),
      });

      const results = (await res.json()) as UnifiedAuditResult & { error?: string; code?: string };
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Sign in to run unified audit.");
        }
        throw new Error(results.error || "Audit failed");
      }

      setStatus({
        discoverability: layerResultStatus(results, "discoverability"),
        clarity: layerResultStatus(results, "clarity"),
        authority: layerResultStatus(results, "authority"),
        trust: layerResultStatus(results, "trust"),
      });

      const mapped = mapUnifiedAuditToAuditData(results, {
        brandName: brandName.trim(),
        domain: domain.trim(),
        competitors: realCompetitors,
      });
      applyUnifiedAudit(mapped, brandName.trim(), domain.trim());

      if (results.errors?.length) {
        toast.warning("Audit complete with some layer warnings", {
          description: results.errors.join("; "),
        });
      } else {
        toast.success("Audit complete! All 4 layers populated.");
      }
    } catch (error) {
      toastApiError();
      setStatus({
        discoverability: "error",
        clarity: "error",
        authority: "error",
        trust: "error",
      });
      toast.error(error instanceof Error ? error.message : "Audit failed. Check console for details.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <TooltipWrapper content="Run a full audit across all 4 layers">
        <Button
          id="run-audit-button"
          onClick={runAudit}
          disabled={isRunning}
          className="w-full sm:w-auto"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Audit...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Run Full AI Search Audit
            </>
          )}
        </Button>
      </TooltipWrapper>

      {isRunning && (
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 sm:text-sm">
          {(Object.keys(LAYER_LABELS) as AuditLayerId[]).map((layer) => (
            <div key={layer} className="text-center">
              <StatusIcon status={status[layer]} />
              <span className="ml-1">{LAYER_LABELS[layer]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
