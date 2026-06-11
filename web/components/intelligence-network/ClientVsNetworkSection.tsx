"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NetworkInsightsCards } from "@/components/intelligence-network/NetworkInsightsCards";
import type { ClientNetworkComparison } from "@/types/competitive-intelligence-network";

function formatMetric(metric: string): string {
  return metric.replace(/_/g, " ");
}

export function ClientVsNetworkSection({ clientId }: { clientId: string }) {
  const [data, setData] = useState<ClientNetworkComparison | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/agency/clients/${clientId}/intelligence-network`);
    if (res.ok) {
      setData((await res.json()) as ClientNetworkComparison);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const displayIndustry =
    data.clientIndustry === "saas"
      ? "SaaS"
      : data.clientIndustry === "e-commerce"
        ? "E-commerce"
        : data.clientIndustry;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4" />
            vs network benchmarks
            <Badge variant="secondary" className="ml-auto font-normal">
              {displayIndustry} · strength {data.network.networkEffects.networkStrength}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.clientVsNetwork.map((row) => (
              <div key={row.metric} className="rounded-lg border p-3">
                <p className="text-xs capitalize text-muted-foreground">
                  {formatMetric(row.metric)}
                </p>
                <p className="mt-1 text-xl font-bold">
                  {row.clientValue}
                  {row.unit ?? ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Network avg: {row.networkValue}
                  {row.unit ?? ""}
                </p>
                <Badge
                  variant={row.delta >= 0 ? "secondary" : "destructive"}
                  className="mt-2"
                >
                  {row.delta >= 0 ? "+" : ""}
                  {row.delta}
                  {row.unit ?? ""} vs network
                </Badge>
              </div>
            ))}
          </div>
          <Link
            href="/agency/intelligence-network"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            View full intelligence network →
          </Link>
        </CardContent>
      </Card>

      {data.relevantInsights.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-medium">Network insights for this client</h3>
          <NetworkInsightsCards insights={data.relevantInsights.slice(0, 4)} />
        </div>
      ) : null}
    </div>
  );
}
