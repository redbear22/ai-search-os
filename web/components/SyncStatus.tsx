"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CITATION_QUEUE_CHANGED,
  getPendingCitationQueueCount,
  syncPendingOutreachTasks,
  syncPendingQueue,
} from "@/lib/citation-engine-client";
import { cn } from "@/lib/utils";

const PENDING_OUTREACH_KEY = "pending_outreach_tasks";

function getPendingOutreachCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return JSON.parse(localStorage.getItem(PENDING_OUTREACH_KEY) || "[]").length;
  } catch {
    return 0;
  }
}

export function SyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(() => {
    setPendingCount(getPendingCitationQueueCount() + getPendingOutreachCount());
  }, []);

  useEffect(() => {
    refreshCount();

    const onQueueChange = () => refreshCount();
    window.addEventListener(CITATION_QUEUE_CHANGED, onQueueChange);
    window.addEventListener("storage", onQueueChange);

    return () => {
      window.removeEventListener(CITATION_QUEUE_CHANGED, onQueueChange);
      window.removeEventListener("storage", onQueueChange);
    };
  }, [refreshCount]);

  const handleSync = async () => {
    if (pendingCount === 0 || syncing) return;
    setSyncing(true);
    try {
      await syncPendingQueue();
      await syncPendingOutreachTasks();
    } finally {
      refreshCount();
      setSyncing(false);
    }
  };

  const synced = pendingCount === 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            synced ? "bg-emerald-500" : "bg-amber-500"
          )}
          aria-hidden
        />
        <span className="hidden sm:inline">
          {synced ? "Synced" : `${pendingCount} pending`}
        </span>
      </div>
      {!synced && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => void handleSync()}
          disabled={syncing}
          aria-label="Sync pending items"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
