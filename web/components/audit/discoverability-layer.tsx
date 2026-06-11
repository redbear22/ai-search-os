"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, TrendingUp } from "lucide-react";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { toastApiError } from "@/lib/api-error";
import {
  detectTrendingTopicsClient,
  type TrendData,
  type TrendGap,
} from "@/lib/trends-mcp-client";
import { useAuditStore } from "@/store/auditStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DiscoverabilityLayer() {
  const { discoverability, setSeo, setAso, updateCompetitor, addCompetitor, removeCompetitor } =
    useAuditStore();

  const auditBrandName = useAuditStore((s) => s.auditBrandName);
  const auditDomain = useAuditStore((s) => s.auditDomain);
  const [brandKeyword, setBrandKeyword] = useState(auditBrandName || auditDomain);

  useEffect(() => {
    if (auditBrandName || auditDomain) {
      setBrandKeyword(auditBrandName || auditDomain);
    }
  }, [auditBrandName, auditDomain]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [gaps, setGaps] = useState<TrendGap[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  const competitorNames = discoverability.competitors
    .map((c) => c.name.trim())
    .filter(Boolean);

  async function handleFetchTrends() {
    const keyword = brandKeyword.trim();
    if (!keyword) return;
    setTrendsLoading(true);
    setTrendsError(null);
    try {
      const keywords = [keyword, ...competitorNames];
      const res = await fetch("/api/trends/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, sources: ["google", "youtube"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch trends");
      setTrends(data.trends);
      setUsingMock(!!data.mock);
    } catch {
      setTrendsError("Failed to fetch trends");
      toastApiError();
    } finally {
      setTrendsLoading(false);
    }
  }

  async function handleDetectGaps() {
    const domain = brandKeyword.trim();
    if (!domain) return;
    setGapsLoading(true);
    setTrendsError(null);
    try {
      const result = await detectTrendingTopicsClient(domain, competitorNames);
      setGaps(result);
    } catch {
      setTrendsError("Failed to detect gaps");
      toastApiError();
    } finally {
      setGapsLoading(false);
    }
  }

  function applyTrendsToAso() {
    const keyword = brandKeyword.trim();
    const brandTrends = trends.filter((t) => t.keyword === keyword);
    if (!brandTrends.length) return;
    const avg = Math.round(
      brandTrends.reduce((sum, t) => sum + t.score, 0) / brandTrends.length
    );
    setAso({ aiVisibilityScore: avg });
  }

  function applyTrendsToCompetitors() {
    for (let i = 0; i < discoverability.competitors.length; i++) {
      const name = discoverability.competitors[i].name.trim();
      if (!name) continue;
      const compTrends = trends.filter((t) => t.keyword === name);
      if (!compTrends.length) continue;
      const avg = Math.round(
        compTrends.reduce((sum, t) => sum + t.score, 0) / compTrends.length
      );
      updateCompetitor(i, { aiVisibility: avg });
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SEO metrics</CardTitle>
            <CardDescription>Traditional search discoverability signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="traffic">Monthly traffic</Label>
              <Input
                id="traffic"
                type="number"
                value={discoverability.seo.traffic}
                onChange={(e) => setSeo({ traffic: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Ranking keywords</Label>
              <Input
                id="keywords"
                type="number"
                value={discoverability.seo.keywords}
                onChange={(e) => setSeo({ keywords: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteHealth">Site health score (0–100)</Label>
              <Input
                id="siteHealth"
                type="number"
                min={0}
                max={100}
                value={discoverability.seo.siteHealth}
                onChange={(e) => setSeo({ siteHealth: Number(e.target.value) || 0 })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ASO metrics</CardTitle>
            <CardDescription>AI Search Optimization visibility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aiVisibility">AI visibility score (0–100)</Label>
              <Input
                id="aiVisibility"
                type="number"
                min={0}
                max={100}
                value={discoverability.aso.aiVisibilityScore}
                onChange={(e) => setAso({ aiVisibilityScore: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandMentions">Brand mentions in AI answers</Label>
              <Input
                id="brandMentions"
                type="number"
                value={discoverability.aso.brandMentions}
                onChange={(e) => setAso({ brandMentions: Number(e.target.value) || 0 })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trends MCP
          </CardTitle>
          <CardDescription>
            Pull normalized trend scores (0–100) from Google and YouTube to benchmark discoverability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="brandKeyword">Brand / domain keyword</Label>
              <Input
                id="brandKeyword"
                value={brandKeyword}
                onChange={(e) => setBrandKeyword(e.target.value)}
                placeholder="e.g., Breville, acme.com"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleFetchTrends}
              disabled={trendsLoading || !brandKeyword.trim()}
            >
              {trendsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Fetch trend scores
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDetectGaps}
              disabled={gapsLoading || !brandKeyword.trim() || !competitorNames.length}
            >
              {gapsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Detect gaps
            </Button>
          </div>
          {usingMock && (
            <p className="text-xs text-amber-600">
              Using demo trend data — set TRENDS_MCP_API_KEY in web/.env.local for live scores.
            </p>
          )}
          {trendsError && <p className="text-sm text-red-500">{trendsError}</p>}
          {trendsLoading && <TableSkeleton rows={4} columns={4} />}
          {!trendsLoading && trends.length > 0 && (
            <>
              <ResponsiveTable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>As of</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trends.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell>{t.keyword}</TableCell>
                      <TableCell className="capitalize">{t.source}</TableCell>
                      <TableCell>{t.score}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{t.timestamp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ResponsiveTable>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={applyTrendsToAso}>
                  Apply brand avg → AI visibility
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={applyTrendsToCompetitors}>
                  Apply competitor avgs → table
                </Button>
              </div>
            </>
          )}
          {gapsLoading && <TableSkeleton rows={4} columns={5} />}
          {!gapsLoading && gaps.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Trending topics competitors lead on</p>
              <ResponsiveTable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competitor</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Competitor</TableHead>
                    <TableHead>Gap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gaps.map((g, i) => (
                    <TableRow key={i}>
                      <TableCell>{g.topic}</TableCell>
                      <TableCell className="capitalize">{g.source}</TableCell>
                      <TableCell>{g.brandScore}</TableCell>
                      <TableCell>{g.competitorScore}</TableCell>
                      <TableCell>+{g.gap}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ResponsiveTable>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Competitor comparison</CardTitle>
            <CardDescription>Side-by-side discoverability benchmarks</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addCompetitor}>
            <Plus className="mr-1 h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent>
          <ResponsiveTable>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor</TableHead>
                <TableHead>Traffic</TableHead>
                <TableHead>AI visibility</TableHead>
                <TableHead>Brand mentions</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {discoverability.competitors.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Input
                      value={row.name}
                      onChange={(e) => updateCompetitor(i, { name: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={row.traffic}
                      onChange={(e) => updateCompetitor(i, { traffic: Number(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={row.aiVisibility}
                      onChange={(e) => updateCompetitor(i, { aiVisibility: Number(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={row.brandMentions}
                      onChange={(e) => updateCompetitor(i, { brandMentions: Number(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCompetitor(i)}
                      disabled={discoverability.competitors.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ResponsiveTable>
        </CardContent>
      </Card>
    </div>
  );
}
