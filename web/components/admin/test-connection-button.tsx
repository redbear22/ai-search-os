"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { ConnectivityResult, EnvServiceId } from "@/lib/env-diagnostics-types";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function TestConnectionButton({ serviceId }: { serviceId: EnvServiceId }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConnectivityResult | null>(null);

  async function runTest() {
    setLoading(true);
    setResult(null);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const res = await fetch("/api/env-check/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: serviceId }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test failed");
      setResult(data);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.name === "AbortError"
            ? "Request timed out after 30s"
            : e.message
          : "Test failed";
      setResult({
        ok: false,
        message,
        latencyMs: 0,
      });
      toastApiError();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" size="sm" variant="outline" onClick={runTest} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Test connection
      </Button>

      {result && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {result.ok ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className={result.ok ? "text-green-600" : "text-red-500"}>{result.message}</span>
              {result.latencyMs > 0 && (
                <span className="text-xs text-muted-foreground">({result.latencyMs}ms)</span>
              )}
            </div>
            {result.usage && (
              <div className="rounded-md bg-muted/50 p-3 text-xs">
                <p className="mb-1 font-medium">Usage / billing</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  {Object.entries(result.usage).map(([key, val]) => (
                    <li key={key}>
                      <span className="capitalize">{key.replace(/_/g, " ")}</span>: {val ?? "—"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
