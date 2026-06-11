"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import { CardSkeleton, ChartSkeleton } from "@/components/LoadingSkeleton";
import { toastApiError } from "@/lib/api-error";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getTopicVelocityClient,
  detectTrendingTopicsClient,
  type VelocityPoint,
  type TrendGap,
} from "@/lib/trends-mcp-client";
import type { AIPlatform } from "@/lib/audit-types";
import {
  CLARITY_PLATFORMS,
  CLARITY_PLATFORM_LABELS,
} from "@/lib/clarity-comparison";
import { ClarityComparisonView } from "@/components/audit/clarity-comparison-view";
import { useClarityAI } from "@/hooks/useClarityAI";
import { useAuditStore } from "@/store/auditStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StringArrayInput } from "@/components/audit/string-array-input";

export type ClarityAIHandlers = ReturnType<typeof useClarityAI>;

function PlatformPanel({
  platform,
  brand,
  onQuery,
  getResponse,
  getLoading,
  getError,
}: {
  platform: AIPlatform;
  brand: string;
  onQuery: (platform: AIPlatform, brandName: string) => Promise<void>;
  getResponse: (platform: string) => string;
  getLoading: (platform: string) => boolean;
  getError: (platform: string) => string | null;
}) {
  const data = useAuditStore((s) => s.clarity.platforms[platform]);
  const setPlatformClarity = useAuditStore((s) => s.setPlatformClarity);
  const setPlatformArray = useAuditStore((s) => s.setPlatformArray);

  const platformLabel = CLARITY_PLATFORM_LABELS[platform] ?? platform;
  const loading = getLoading(platform);
  const error = getError(platform);
  const aiResponse = getResponse(platform);
  const responseText = data.responseText || aiResponse;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="capitalize">{platformLabel}</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onQuery(platform, brand.trim())}
            disabled={loading || !brand.trim()}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Query AI
          </Button>
        </div>
        {loading ? (
          <CardSkeleton />
        ) : (
          <Textarea
            rows={4}
            data-platform={platform}
            value={responseText}
            onChange={(e) => setPlatformClarity(platform, { responseText: e.target.value })}
            placeholder={`Paste ${platformLabel}'s response here or click "Query AI"`}
          />
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!brand.trim() && (
          <p className="text-sm text-muted-foreground">Enter a brand name above before querying.</p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StringArrayInput
          label="Correct items"
          items={data.correctItems}
          onChange={(items) => setPlatformArray(platform, "correctItems", items)}
          placeholder="Accurate claim or product..."
        />
        <StringArrayInput
          label="Wrong items"
          items={data.wrongItems}
          onChange={(items) => setPlatformArray(platform, "wrongItems", items)}
          placeholder="Inaccurate or misleading..."
        />
        <StringArrayInput
          label="Missing items"
          items={data.missingItems}
          onChange={(items) => setPlatformArray(platform, "missingItems", items)}
          placeholder="Omitted but important..."
        />
      </div>
    </div>
  );
}

export function ClarityLayer({ clarityAI }: { clarityAI: ClarityAIHandlers }) {
  const auditBrandName = useAuditStore((s) => s.auditBrandName);
  const [brand, setBrand] = useState(auditBrandName);

  useEffect(() => {
    if (auditBrandName) setBrand(auditBrandName);
  }, [auditBrandName]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const CLARITY_API_ROUTES: Record<AIPlatform, string> = {
      chatgpt: "/api/clarity/openai",
      perplexity: "/api/clarity/perplexity",
      claude: "/api/clarity/claude",
      gemini: "/api/clarity/gemini",
    };
    const w = window as Window & {
      claritySetResponse?: (platform: AIPlatform, text: string) => void;
      testAllClarityPlatforms?: (brand?: string) => Promise<void>;
    };
    w.claritySetResponse = (platform, text) => {
      useAuditStore.getState().setPlatformClarity(platform, { responseText: text });
    };
    w.testAllClarityPlatforms = async (brand = "PickAdviser") => {
      for (const platform of CLARITY_PLATFORMS) {
        const endpoint = CLARITY_API_ROUTES[platform];
        const body =
          platform === "chatgpt"
            ? { brandName: brand, task: "brand_short", model: "gpt-4o-mini" }
            : { brandName: brand, task: "brand_short" };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.response) {
          w.claritySetResponse?.(platform, data.response);
          console.log(`✅ ${platform} saved (${data.response.length} chars)`);
        } else {
          toastApiError();
        }
      }
    };
    return () => {
      delete w.claritySetResponse;
      delete w.testAllClarityPlatforms;
    };
  }, []);
  const [velocity, setVelocity] = useState<VelocityPoint[]>([]);
  const [trendGaps, setTrendGaps] = useState<TrendGap[]>([]);
  const [velocityLoading, setVelocityLoading] = useState(false);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<AIPlatform>("chatgpt");

  const { queryAI, queryAllPlatforms, getResponse, getLoading, getError } = clarityAI;
  const setPlatformArray = useAuditStore((s) => s.setPlatformArray);
  const competitors = useAuditStore((s) => s.discoverability.competitors);

  const competitorNames = competitors.map((c) => c.name.trim()).filter(Boolean);

  const handleFetchVelocity = useCallback(async () => {
    const topic = brand.trim();
    if (!topic) return;
    setVelocityLoading(true);
    setTrendsError(null);
    try {
      const points = await getTopicVelocityClient(topic, 30);
      setVelocity(points);
    } catch {
      setTrendsError("Failed to fetch velocity");
      toastApiError();
    } finally {
      setVelocityLoading(false);
    }
  }, [brand]);

  const handleDetectTrendGaps = useCallback(async () => {
    const domain = brand.trim();
    if (!domain) return;
    setGapsLoading(true);
    setTrendsError(null);
    try {
      const gaps = await detectTrendingTopicsClient(domain, competitorNames);
      setTrendGaps(gaps);
    } catch {
      setTrendsError("Failed to detect trend gaps");
      toastApiError();
    } finally {
      setGapsLoading(false);
    }
  }, [brand, competitorNames]);

  const addTrendGapsToMissing = useCallback(() => {
    if (!trendGaps.length) return;
    const platform = activePlatform;
    const existing = useAuditStore.getState().clarity.platforms[platform].missingItems;
    const newItems = trendGaps.map(
      (g) => `Trending topic: ${g.topic} (${g.source}, gap +${g.gap})`
    );
    const merged = [...existing];
    for (const item of newItems) {
      if (!merged.includes(item)) merged.push(item);
    }
    setPlatformArray(platform, "missingItems", merged);
  }, [trendGaps, activePlatform, setPlatformArray]);

  const handleAIQuery = useCallback(
    async (platform: AIPlatform, brandName: string) => {
      await queryAI(platform, brandName, { task: "brand_overview" });
    },
    [queryAI]
  );

  const handleQueryAll = useCallback(
    async (brandName: string) => {
      await queryAllPlatforms(brandName);
    },
    [queryAllPlatforms]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clarity layer</CardTitle>
        <CardDescription>
          Query each AI platform natively — ChatGPT (OpenAI), Perplexity, Claude, Google AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="clarity-brand">Brand name</Label>
          <Input
            id="clarity-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g., Breville, Acme Corp"
          />
          <p className="text-xs text-muted-foreground">
            Each tab calls its own API: OPENAI_API_KEY (ChatGPT), PERPLEXITY_API_KEY
            (Perplexity), ANTHROPIC_API_KEY (Claude), GOOGLE_GEMINI_API_KEY (Google AI).
          </p>
        </div>

        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Trends MCP — content gap analysis
            </CardTitle>
            <CardDescription>
              Topic velocity and competitor trend gaps feed into missing-items on each platform tab
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleFetchVelocity}
                disabled={velocityLoading || !brand.trim()}
              >
                {velocityLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Topic velocity (30d)
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDetectTrendGaps}
                disabled={gapsLoading || !brand.trim() || !competitorNames.length}
              >
                {gapsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Detect trending gaps
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={addTrendGapsToMissing}
                disabled={!trendGaps.length}
              >
                Add gaps → missing items
              </Button>
            </div>
            {trendsError && <p className="text-sm text-red-500">{trendsError}</p>}
            {velocityLoading && <ChartSkeleton className="h-40" />}
            {!velocityLoading && velocity.length > 0 && (
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={velocity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={32} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {trendGaps.length > 0 && (
              <ul className="text-sm text-muted-foreground space-y-1">
                {trendGaps.slice(0, 5).map((g, i) => (
                  <li key={i}>
                    {g.topic} leads on {g.source} (+{g.gap} vs brand score {g.brandScore})
                  </li>
                ))}
              </ul>
            )}
            {!competitorNames.length && (
              <p className="text-xs text-muted-foreground">
                Add competitor names in the Discoverability layer to enable gap detection.
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="comparison">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="comparison">Comparison view</TabsTrigger>
            <TabsTrigger value="audit">Platform audit</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="mt-4">
            <ClarityComparisonView
              brand={brand}
              onQueryAll={handleQueryAll}
              getResponse={getResponse}
              getLoading={getLoading}
            />
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Tabs
              defaultValue="chatgpt"
              onValueChange={(v) => setActivePlatform(v as AIPlatform)}
            >
              <TabsList className="grid w-full grid-cols-4 overflow-x-auto">
                {CLARITY_PLATFORMS.map((platform) => (
                  <TabsTrigger
                    key={platform}
                    value={platform}
                    className="text-xs sm:text-sm"
                  >
                    {CLARITY_PLATFORM_LABELS[platform]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {CLARITY_PLATFORMS.map((platform) => (
                <TabsContent key={platform} value={platform}>
                  <PlatformPanel
                    platform={platform}
                    brand={brand}
                    onQuery={handleAIQuery}
                    getResponse={getResponse}
                    getLoading={getLoading}
                    getError={getError}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
