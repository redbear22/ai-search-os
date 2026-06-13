"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  FileText,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AI_CRAWLERS, type CrawlerKey } from "@/lib/crawler-agents";
import type { BotSummary } from "@/lib/crawler-log-parser";
import { useActionStore } from "@/store/actionStore";

type RobotsResult = {
  robotsBlocked: boolean;
  sitemapExists: boolean;
  blockedBots: string[];
  blockedBotDetails: { key: string; name: string; docs: string }[];
  fixes: string[];
  robotsTxt: string | null;
  siteUrl: string;
};

type ParseResult = {
  byBot: BotSummary[];
  neverCrawled: { path: string; severity: "high" | "medium" }[];
  errors: { bot: CrawlerKey; page: string; statusCode: number }[];
  hitCount: number;
  linesProcessed: number;
  truncated: boolean;
};

export default function CrawlerLogsPage() {
  const addAction = useActionStore((s) => s.addAction);
  const [siteUrl, setSiteUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [robotsResult, setRobotsResult] = useState<RobotsResult | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const runQuickCheck = async () => {
    if (!siteUrl.trim()) {
      toast.error("Enter your site URL");
      return;
    }
    setChecking(true);
    try {
      const res = await fetch("/api/crawler-logs/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: siteUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Robots check failed");
        return;
      }
      setRobotsResult(data as RobotsResult);
      toast.success("Robots.txt analysis complete");
    } catch {
      toast.error("Failed to check robots.txt");
    } finally {
      setChecking(false);
    }
  };

  const uploadLog = async (file: File) => {
    if (!siteUrl.trim()) {
      toast.error("Enter your site URL first");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("siteUrl", siteUrl.trim());
      form.append("file", file);
      const res = await fetch("/api/crawler-logs/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Parse failed");
        return;
      }
      setParseResult(data as ParseResult);
      toast.success(`Found ${data.hitCount} AI crawler hits`);
    } catch {
      toast.error("Failed to parse log file");
    } finally {
      setUploading(false);
    }
  };

  const addToActionPlan = (path: string, severity: string) => {
    addAction({
      id: `crawler-${Date.now()}-${path}`,
      layerId: "discoverability",
      description: `AI crawlers have never read ${path} — add internal links and ensure robots.txt allows AI bots`,
      ownerTeam: "SEO",
      ownerPerson: "",
      dueWeek: severity === "high" ? 1 : 2,
      resourceAsks: ["Internal linking", "Robots.txt review"],
      status: "not_started",
      createdAt: new Date().toISOString(),
    });
    toast.success("Added to Action Plan");
  };

  return (
    <div
      className="container mx-auto space-y-8 p-4 sm:p-6"
      style={{ color: "var(--paper, hsl(var(--foreground)))" }}
    >
      <header className="space-y-3">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--accent, hsl(var(--primary)))" }}
        >
          AI Crawler Intelligence
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          See which AI bots are reading your site — and which pages they&apos;ve never seen
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          AI models only cite pages they&apos;ve crawled. If ChatGPT has never read your /case-studies
          page, it can&apos;t cite it.
        </p>
      </header>

      {/* Quick Check */}
      <Card className="border" style={{ background: "var(--panel, hsl(var(--card)))" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" style={{ color: "var(--accent)" }} />
            Quick Check — no log file needed
          </CardTitle>
          <CardDescription>
            Instantly check whether AI crawlers are blocked in robots.txt and if a sitemap exists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 space-y-2">
              <Label htmlFor="site-url">Site URL</Label>
              <Input
                id="site-url"
                placeholder="https://yoursite.com"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <LoadingButton loading={checking} onClick={runQuickCheck}>
                Check robots.txt
              </LoadingButton>
            </div>
          </div>

          {robotsResult && (
            <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: "var(--line, hsl(var(--border)))" }}>
              <div className="flex flex-wrap gap-3">
                <Badge variant={robotsResult.robotsBlocked ? "destructive" : "default"}>
                  {robotsResult.robotsBlocked ? "Some AI bots blocked" : "No AI blocks detected"}
                </Badge>
                <Badge variant={robotsResult.sitemapExists ? "default" : "secondary"}>
                  {robotsResult.sitemapExists ? "Sitemap found" : "No sitemap detected"}
                </Badge>
              </div>

              {robotsResult.blockedBotDetails.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium" style={{ color: "var(--gap)" }}>
                    Blocked AI crawlers
                  </p>
                  <ul className="space-y-1 text-sm">
                    {robotsResult.blockedBotDetails.map((b) => (
                      <li key={b.key} className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 shrink-0" style={{ color: "var(--gap)" }} />
                        {b.name}
                        <a href={b.docs} target="_blank" rel="noopener noreferrer" className="text-primary">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {robotsResult.fixes.length > 0 && (
                <div className="space-y-2 rounded-md p-3" style={{ background: "var(--ink, hsl(var(--background)))" }}>
                  <p className="text-sm font-medium">Fix suggestions</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {robotsResult.fixes.map((fix, i) => (
                      <li key={i}>{fix}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Upload */}
      <Card className="border" style={{ background: "var(--panel, hsl(var(--card)))" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" style={{ color: "var(--accent)" }} />
            Log Analysis
          </CardTitle>
          <CardDescription>
            Upload your server access log (.log, .txt, or .gz). We parse AI crawler hits only — up to
            50,000 lines, 10MB max.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md p-4 text-sm text-muted-foreground" style={{ background: "var(--ink)" }}>
            <p className="mb-2 font-medium text-foreground">How to download logs:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>cPanel / Apache — Raw Access Logs in Metrics</li>
              <li>Nginx — /var/log/nginx/access.log</li>
              <li>Cloudflare — Analytics → Logs → Export</li>
              <li>Vercel — Project → Logs → Download</li>
            </ul>
          </div>

          <div>
            <Label htmlFor="log-file">Access log file</Label>
            <Input
              id="log-file"
              type="file"
              accept=".log,.txt,.gz"
              disabled={uploading}
              className="mt-2"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadLog(file);
              }}
            />
            {uploading && <p className="mt-2 text-sm text-muted-foreground">Parsing log file…</p>}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {parseResult && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {parseResult.byBot.map((bot) => {
              const info = AI_CRAWLERS[bot.bot];
              return (
                <Card key={bot.bot} style={{ background: "var(--panel)" }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Bot className="h-4 w-4" style={{ color: info.color }} />
                      {info.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{bot.pagesCrawled}</p>
                    <p className="text-xs text-muted-foreground">pages crawled</p>
                    {bot.lastSeen && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Last: {new Date(bot.lastSeen).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {parseResult.neverCrawled.length > 0 && (
            <Card style={{ borderColor: "var(--gap)" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: "var(--gap)" }}>
                  <AlertTriangle className="h-5 w-5" />
                  Never crawled by any AI bot
                </CardTitle>
                <CardDescription>
                  These sitemap pages have no AI crawler hits in your log file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {parseResult.neverCrawled.slice(0, 20).map(({ path, severity }) => (
                  <div
                    key={path}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                    style={{ background: "var(--ink)" }}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <code className="text-sm">{path}</code>
                      <Badge variant={severity === "high" ? "destructive" : "secondary"}>
                        {severity.toUpperCase()}
                      </Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addToActionPlan(path, severity)}>
                      Add to action plan
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {parseResult.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: "var(--warn, #fbbf24)" }}>
                  <XCircle className="h-5 w-5" />
                  Crawler errors (4xx / 5xx)
                </CardTitle>
                <CardDescription>
                  These errors stop AI from indexing your content.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4">Bot</th>
                        <th className="pb-2 pr-4">Page</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.errors.slice(0, 50).map((err, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 pr-4">{AI_CRAWLERS[err.bot].name}</td>
                          <td className="py-2 pr-4 font-mono text-xs">{err.page}</td>
                          <td className="py-2" style={{ color: "var(--gap)" }}>
                            {err.statusCode}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {parseResult.truncated && (
            <p className="text-sm text-muted-foreground">
              Processed {parseResult.linesProcessed.toLocaleString()} lines (file truncated at 50,000).
            </p>
          )}
        </>
      )}

      {!parseResult && !robotsResult && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4" style={{ color: "var(--win)" }} />
          Rules-first analysis — no LLM API calls required.
        </div>
      )}
    </div>
  );
}
