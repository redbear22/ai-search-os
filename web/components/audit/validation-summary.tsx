"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { validateAllLayers } from "@/lib/audit-validation";
import { AUDIT_LAYER_META } from "@/lib/audit-types";
import { useAuditStore } from "@/store/auditStore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ValidationSummary() {
  const discoverability = useAuditStore((s) => s.discoverability);
  const clarity = useAuditStore((s) => s.clarity);
  const authority = useAuditStore((s) => s.authority);
  const trust = useAuditStore((s) => s.trust);
  const validations = validateAllLayers({ discoverability, clarity, authority, trust });
  const completeCount = validations.filter((v) => v.complete).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Audit progress</CardTitle>
          <Badge variant={completeCount === 4 ? "default" : "secondary"}>
            {completeCount} / 4 complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {validations.map((v) => {
            const meta = AUDIT_LAYER_META.find((m) => m.id === v.id)!;
            return (
              <div
                key={v.id}
                className={cn(
                  "rounded-md border p-3 text-sm",
                  v.complete ? "border-primary/40 bg-primary/5" : "border-border"
                )}
              >
                <div className="flex items-center gap-2 font-medium">
                  {v.complete ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  {meta.title}
                </div>
                {!v.complete && v.missing.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Missing: {v.missing.slice(0, 2).join(", ")}
                    {v.missing.length > 2 ? ` +${v.missing.length - 2}` : ""}
                  </p>
                )}
                {v.complete && (
                  <p className="mt-1 text-xs text-muted-foreground">Ready</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
