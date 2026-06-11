"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/useMobile";

function SummaryCardSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-3 pt-4 sm:p-6 sm:pt-6">
        <Skeleton className="h-7 w-10 sm:h-8 sm:w-12" />
        <Skeleton className="mt-2 h-3 w-16 sm:h-4 sm:w-20" />
      </CardContent>
    </Card>
  );
}

function GapCardSkeleton() {
  return (
    <div className="rounded-lg border border-l-4 border-l-muted bg-card p-4 sm:p-6">
      <div className="flex min-h-[120px] flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <Skeleton className="h-10 w-full shrink-0 sm:h-9 sm:w-28" />
      </div>
    </div>
  );
}

export function GapsPageSkeleton() {
  const isMobile = useMobile();

  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading gaps">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <Skeleton className="h-9 w-full sm:w-28" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SummaryCardSkeleton key={i} />
        ))}
      </div>

      <div>
        <div
          className={cn(
            "mb-4 flex h-auto w-full gap-1 rounded-md bg-muted p-1",
            isMobile ? "grid grid-cols-2 sm:grid-cols-3" : "overflow-x-auto"
          )}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 min-w-[4.5rem] flex-1 rounded-sm" />
          ))}
        </div>

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <GapCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
