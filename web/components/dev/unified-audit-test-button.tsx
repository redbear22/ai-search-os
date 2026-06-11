"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastApiError } from "@/lib/api-error";

/** Temporary dev helper — calls runUnifiedAudit via API and logs to browser console. */
export function UnifiedAuditTestButton() {
  const [loading, setLoading] = useState(false);

  const testAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit/unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: "PickAdviser",
          domain: "pickadviser.org",
          competitors: ["competitor1.com", "competitor2.com"],
        }),
      });
      const results = await res.json();
      if (!res.ok) throw new Error(results.error || "Audit failed");
      console.log("Unified audit results:", results);
    } catch {
      toastApiError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={testAudit} disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Test unified audit (dev)
    </Button>
  );
}
