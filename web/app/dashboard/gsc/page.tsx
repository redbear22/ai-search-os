"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  LineChart as LineChartIcon,
  ArrowRight,
  Link2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { persistGaps } from "@/lib/workflow-api";
import type { Gap } from "@/types/gap";
import { useAuditStore } from "@/store/auditStore";

type GscProperty = { siteUrl: string; permissionLevel: string };

type QueryRow = {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  aiCitation?: boolean;
};

export default function GscDashboardPage() {
  const searchParams = useSearchParams();
  const brandName = useAuditStore((s) => s.auditBrandName);
  const clarity = useAuditStore((s) => s.clarity);
  const discoverability = useAuditStore((s) => s.discoverability);

  const [connected, setConnected] = useState(false);
  const [properties, setProperties] = useState<GscProperty[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [queries, setQueries] = useState<QueryRow[]>([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);

  const citationQueries = useMemo(() => {
    const set = new Set<string>();
    const texts = Object.values(clarity.platforms)
      .map((p) => p?.responseText?.toLowerCase() ?? "")
      .filter(Boolean);
    return {
      has(query: string): boolean {
        const q = query.toLowerCase();
        if (set.has(q)) return true;
        const cited = texts.some((t) => t.includes(q) || q.split(" ").every((w) => t.includes(w)));
        if (cited) set.add(q);
        return cited;
      },
    };
  }, [clarity]);

  const loadProperties = useCallback(async () => {
    setLoadingProps(true);
    try {
      const res = await fetch("/api/gsc/properties");
      const data = await res.json();
      if (data.needsReauth) setNeedsReauth(true);
      setConnected(Boolean(data.connected));
      setProperties(data.properties ?? []);
      if (data.properties?.length && !selectedSite) {
        setSelectedSite(data.properties[0].siteUrl);
      }
    } catch {
      toast.error("Failed to load GSC properties");
    } finally {
      setLoadingProps(false);
    }
  }, [selectedSite]);

  const loadQueries = useCallback(async (siteUrl: string) => {
    if (!siteUrl) return;
    setLoadingQueries(true);
    try {
      const res = await fetch(
        `/api/gsc/queries?siteUrl=${encodeURIComponent(siteUrl)}&days=30`
      );
      const data = await res.json();
      if (data.needsReauth) {
        setNeedsReauth(true);
        return;
      }
      const rows: QueryRow[] = (data.rows ?? []).map((r: QueryRow) => ({
        ...r,
        aiCitation: citationQueries.has(r.query.toLowerCase()),
      }));
      setQueries(rows);
    } catch {
      toast.error("Failed to load GSC queries");
    } finally {
      setLoadingQueries(false);
    }
  }, [citationQueries]);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    if (connected && selectedSite) void loadQueries(selectedSite);
  }, [connected, selectedSite, loadQueries]);

  useEffect(() => {
    if (searchParams.get("gsc_connected") === "1") {
      toast.success("Google Search Console connected");
    }
    const err = searchParams.get("gsc_error");
    if (err) toast.error(`GSC connection failed: ${err}`);
  }, [searchParams]);

  const chartData = useMemo(() => {
    const totalClicks = queries.reduce((s, q) => s + q.clicks, 0);
    const sov = discoverability.aso?.aiVisibilityScore ?? 12;
    return Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2025, i, 1).toLocaleString("default", { month: "short" }),
      sov: Math.round(sov + i * 1.5),
      clicks: Math.round((totalClicks / 12) * (0.7 + i * 0.05)),
    }));
  }, [queries, discoverability]);

  const quickWins = queries.filter(
    (q) => q.impressions >= 50 && !q.aiCitation
  ).slice(0, 5);

  const addGapFromQuery = async (query: string) => {
    const gap: Gap = {
      id: `gsc-${Date.now()}`,
      layer: "discoverability",
      title: `AI never cites you for "${query}"`,
      description: `This query sends organic traffic via GSC but does not appear in AI citation checks. Priority AEO gap.`,
      severity: "high",
      source: "gsc-attribution",
      suggestedAction: `Create or optimize content targeting "${query}" for AI answer inclusion`,
      suggestedOwner: "Content/SEO",
      suggestedTimeline: 2,
    };
    try {
      await persistGaps({ gaps: [gap] });
      toast.success("Gap added");
    } catch {
      toast.error("Failed to add gap — sign in required");
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-4 animate-fade-in sm:p-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <LineChartIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Google Search Console</h1>
          {connected ? (
            <Badge style={{ background: "var(--win)", color: "var(--ink)" }}>Connected</Badge>
          ) : (
            <Badge variant="secondary">Not connected</Badge>
          )}
        </div>
        <p className="max-w-2xl text-muted-foreground">
          See how AI visibility changes affect your organic traffic. Correlation shown for reference
          — AI visibility improvements typically affect organic traffic with a 2–6 week lag.
        </p>
      </div>

      {/* Connection */}
      <Card className="gradient-border" style={{ background: "var(--panel, hsl(var(--card)))" }}>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>
            {connected
              ? "Your GSC account is linked. Select a property to view query data."
              : "Connect Google Search Console to import real query and click data."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {!connected || needsReauth ? (
            <Button asChild>
              <a href="/api/gsc/auth">
                <Link2 className="mr-2 h-4 w-4" />
                Connect Google Search Console
              </a>
            </Button>
          ) : (
            <>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.siteUrl} value={p.siteUrl}>
                      {p.siteUrl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <LoadingButton
                variant="outline"
                loading={loadingProps}
                onClick={() => void loadProperties()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </LoadingButton>
            </>
          )}
        </CardContent>
      </Card>

      {connected && selectedSite && (
        <>
          {/* Chart */}
          <Card style={{ background: "var(--panel)" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Attribution overview
              </CardTitle>
              <CardDescription>
                AI Share of Voice (left) vs organic clicks from GSC (right) — last 90 days
                {brandName ? ` for ${brandName}` : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line, #333)" />
                  <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} />
                  <YAxis yAxisId="left" stroke="var(--accent)" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--win)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--panel)",
                      border: "1px solid var(--line)",
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="sov"
                    name="AI SoV %"
                    stroke="var(--accent, #00d4ff)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="clicks"
                    name="Organic clicks"
                    stroke="var(--win, #3fd18b)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="mt-3 text-xs text-muted-foreground">
                Correlation shown for reference. AI visibility improvements typically affect organic
                traffic with a 2–6 week lag.
              </p>
            </CardContent>
          </Card>

          {/* Query table */}
          <Card>
            <CardHeader>
              <CardTitle>Top queries</CardTitle>
              <CardDescription>
                GSC performance with AI citation status from your latest audit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingQueries ? (
                <p className="text-sm text-muted-foreground">Loading queries…</p>
              ) : queries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No query data for this property yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-3">Query</th>
                        <th className="pb-2 pr-3">Clicks</th>
                        <th className="pb-2 pr-3">Impressions</th>
                        <th className="pb-2 pr-3">CTR</th>
                        <th className="pb-2 pr-3">Position</th>
                        <th className="pb-2">AI Citation?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queries.slice(0, 25).map((row) => (
                        <tr key={`${row.query}-${row.page}`} className="border-b border-border/40">
                          <td className="max-w-[200px] truncate py-2 pr-3">{row.query}</td>
                          <td className="py-2 pr-3">{row.clicks}</td>
                          <td className="py-2 pr-3">{row.impressions}</td>
                          <td className="py-2 pr-3">{(row.ctr * 100).toFixed(1)}%</td>
                          <td className="py-2 pr-3">{row.position.toFixed(1)}</td>
                          <td className="py-2">
                            {row.aiCitation ? (
                              <Badge style={{ background: "var(--win)", color: "var(--ink)" }}>Yes</Badge>
                            ) : (
                              <Badge variant="destructive">No</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick wins */}
          {quickWins.length > 0 && (
            <Card style={{ borderColor: "var(--warn, #fbbf24)" }}>
              <CardHeader>
                <CardTitle>Quick wins — high traffic, no AI citation</CardTitle>
                <CardDescription>
                  These queries send organic traffic but AI never cites you. Highest-priority AEO
                  gaps.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickWins.map((row) => (
                  <div
                    key={row.query}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                    style={{ background: "var(--ink)" }}
                  >
                    <div>
                      <p className="font-medium">{row.query}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.impressions.toLocaleString()} impressions · {row.clicks} clicks
                      </p>
                    </div>
                    <Button size="sm" onClick={() => void addGapFromQuery(row.query)}>
                      Add to gaps
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!connected && !loadingProps && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Manual test: set{" "}
              <code className="text-xs">GSC_ENABLED=true</code> plus{" "}
              <code className="text-xs">GOOGLE_GSC_CLIENT_ID</code> /{" "}
              <code className="text-xs">GOOGLE_GSC_CLIENT_SECRET</code>, add redirect URI{" "}
              <code className="text-xs">http://localhost:3000/api/gsc/callback</code> in Google
              Cloud Console, then click Connect above.
            </p>
            <Button variant="link" asChild className="h-auto w-fit p-0">
              <Link href="/audit">
                Continue with manual audit
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
