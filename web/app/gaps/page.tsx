"use client";

import { useEffect, useState } from "react";
import { GapDashboard } from "@/components/gaps/GapDashboard";
import { GapsPageSkeleton } from "@/components/gaps/GapsPageSkeleton";
import { useMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";
import { useAuditStore } from "@/store/auditStore";

export default function GapsPage() {
  const isMobile = useMobile();
  const [loading, setLoading] = useState(true);

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
    </div>
  );
}
