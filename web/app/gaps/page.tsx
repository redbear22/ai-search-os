"use client";

import { useEffect, useMemo, useState } from "react";
import { GapDashboard } from "@/components/gaps/GapDashboard";
import { GapsPageSkeleton } from "@/components/gaps/GapsPageSkeleton";
import { CompetitorHeatmap } from "@/components/CompetitorHeatmap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";
import { buildHeatmapFromAudit } from "@/lib/competitor-heatmap-data";
import { useAuditStore } from "@/store/auditStore";

export default function GapsPage() {
  const isMobile = useMobile();
  const [loading, setLoading] = useState(true);
  const auditSlice = useAuditStore((s) => ({
    auditBrandName: s.auditBrandName,
    discoverability: s.discoverability,
    clarity: s.clarity,
    authority: s.authority,
    trust: s.trust,
  }));
  const heatmapRows = useMemo(() => buildHeatmapFromAudit(auditSlice), [auditSlice]);

  useEffect(() => {
    const unsub = useAuditStore.persist.onFinishHydration(() => {
      useAuditStore.getState().setHydrated();
      setLoading(false);
    });
    void useAuditStore.persist.rehydrate();
    if (useAuditStore.persist.hasHydrated()) {
      useAuditStore.getState().setHydrated();
      setLoading(false);
    }
    return unsub;
  }, []);

  return (
    <div
      className={cn(
        "container mx-auto space-y-4 animate-fade-in sm:space-y-6 sm:py-8",
        isMobile ? "p-3" : "p-4 sm:p-6"
      )}
    >
      <div>
        <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">Gap Detection</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Automatically identified opportunities to improve your AI search visibility
        </p>
      </div>
      {loading ? <GapsPageSkeleton /> : <GapDashboard />}

      {!loading && heatmapRows.length > 1 && (
        <Card style={{ background: "var(--panel)" }}>
          <CardHeader>
            <CardTitle>Competitor heatmap</CardTitle>
            <CardDescription>
              AI visibility scores across audit layers — find where to attack competitors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompetitorHeatmap rows={heatmapRows} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
