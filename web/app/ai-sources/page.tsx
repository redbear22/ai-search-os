"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, MessageSquare, Youtube, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { persistGaps } from "@/lib/workflow-api";
import type { Gap } from "@/types/gap";
import { useAuditStore } from "@/store/auditStore";
import type { RedditSource } from "@/lib/reddit-sources";
import type { YouTubeSource } from "@/lib/youtube-sources";

export default function AiSourcesPage() {
  const auditBrand = useAuditStore((s) => s.auditBrandName);
  const auditDomain = useAuditStore((s) => s.auditDomain);

  const [brand, setBrand] = useState(auditBrand || "");
  const [topic, setTopic] = useState(
    auditDomain ? `${auditDomain.replace(/^https?:\/\//, "").split(".")[0]} software` : ""
  );
  const [loading, setLoading] = useState(false);
  const [reddit, setReddit] = useState<RedditSource[]>([]);
  const [youtube, setYoutube] = useState<YouTubeSource[]>([]);
  const [youtubeMessage, setYoutubeMessage] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const runSearch = async () => {
    if (!topic.trim()) {
      toast.error("Enter a topic or category");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ topic: topic.trim(), brand: brand.trim() });
      const [redditRes, youtubeRes] = await Promise.all([
        fetch(`/api/sources/reddit?${params}`),
        fetch(`/api/sources/youtube?${params}`),
      ]);
      const redditData = await redditRes.json();
      const youtubeData = await youtubeRes.json();
      setReddit(redditData.sources ?? []);
      setYoutube(youtubeData.sources ?? []);
      setYoutubeMessage(youtubeData.message ?? null);
      setFromCache(Boolean(redditData.cached || youtubeData.cached));
      toast.success("Source intelligence loaded");
    } catch {
      toast.error("Failed to load sources");
    } finally {
      setLoading(false);
    }
  };

  const redditMentions = reddit.filter((r) => r.brandMentioned).length;
  const youtubeMentions = youtube.filter((v) => v.brandMentioned).length;

  const addSourceGap = async (source: "reddit" | "youtube", label: string) => {
    const gap: Gap = {
      id: `source-${source}-${Date.now()}`,
      layer: "authority",
      title: `Brand absent from top ${source === "reddit" ? "Reddit" : "YouTube"} sources`,
      description: `Your brand does not appear in AI-influential ${source} content for "${topic}": ${label}`,
      severity: "high",
      source: "ai-source-intelligence",
      suggestedAction:
        source === "reddit"
          ? `Participate in or create content addressing discussions like "${label}"`
          : `Publish a comparison or explainer video targeting "${topic}"`,
      suggestedOwner: "Content Marketing",
      suggestedTimeline: 3,
    };
    try {
      await persistGaps({ gaps: [gap] });
      toast.success("Gap added");
    } catch {
      toast.error("Failed to add gap");
    }
  };

  return (
    <div className="container mx-auto space-y-8 p-4 sm:p-6">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          AI Source Intelligence
        </p>
        <h1 className="text-3xl font-bold">Where AI learns about your category</h1>
        <p className="max-w-3xl text-muted-foreground">
          AI models cite Reddit and YouTube heavily. These are the sources shaping what AI says about
          your topic — and where you should publish next.
        </p>
      </header>

      <Card style={{ background: "var(--panel)" }}>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="brand">Brand name</Label>
            <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Your brand" />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="topic">Topic / category</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="project management software remote teams"
            />
          </div>
          <LoadingButton loading={loading} onClick={() => void runSearch()}>
            <Search className="mr-2 h-4 w-4" />
            Find sources
          </LoadingButton>
        </CardContent>
      </Card>

      {fromCache && (
        <p className="text-xs text-muted-foreground">Results served from 24h cache.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reddit */}
        <Card style={{ background: "var(--panel)" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-400" />
              Reddit Sources
            </CardTitle>
            <CardDescription>Top discussions AI is likely reading</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reddit.length === 0 ? (
              <p className="text-sm text-muted-foreground">Run a search to see Reddit sources.</p>
            ) : (
              reddit.map((post) => (
                <div
                  key={post.url}
                  className="rounded-md border p-3"
                  style={{ background: "var(--ink)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{post.title}</p>
                    {post.url && (
                      <a href={post.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">r/{post.subreddit}</Badge>
                    <span className="text-muted-foreground">Score {post.citationScore}</span>
                    {post.brandMentioned ? (
                      <Badge style={{ background: "var(--win)", color: "var(--ink)" }}>Brand ✓</Badge>
                    ) : (
                      <Badge variant="secondary">Brand ✗</Badge>
                    )}
                  </div>
                  {!post.brandMentioned && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-auto p-0 text-xs"
                      onClick={() => void addSourceGap("reddit", post.title)}
                    >
                      Add to gaps
                    </Button>
                  )}
                </div>
              ))
            )}
            {reddit.length > 0 && (
              <p className="text-sm">
                Your brand appears in{" "}
                <strong>
                  {redditMentions} of {reddit.length}
                </strong>{" "}
                top Reddit discussions.
                {redditMentions === 0 && (
                  <span className="block mt-1" style={{ color: "var(--gap)" }}>
                    Gap — your brand is absent from the Reddit discussions AI reads most.
                  </span>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        {/* YouTube */}
        <Card style={{ background: "var(--panel)" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" />
              YouTube Sources
            </CardTitle>
            <CardDescription>Top videos AI is likely reading</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {youtubeMessage && youtube.length === 0 && (
              <p className="text-sm text-muted-foreground">{youtubeMessage}</p>
            )}
            {youtube.length === 0 && !youtubeMessage ? (
              <p className="text-sm text-muted-foreground">Run a search to see YouTube sources.</p>
            ) : (
              youtube.map((video) => (
                <div
                  key={video.url}
                  className="rounded-md border p-3"
                  style={{ background: "var(--ink)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{video.title}</p>
                    {video.url && (
                      <a href={video.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{video.channel}</span>
                    <span className="text-muted-foreground">
                      {video.views.toLocaleString()} views
                    </span>
                    {video.brandMentioned ? (
                      <Badge style={{ background: "var(--win)", color: "var(--ink)" }}>Brand ✓</Badge>
                    ) : (
                      <Badge variant="secondary">Brand ✗</Badge>
                    )}
                  </div>
                  {!video.brandMentioned && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-auto p-0 text-xs"
                      onClick={() => void addSourceGap("youtube", video.title)}
                    >
                      Add to gaps
                    </Button>
                  )}
                </div>
              ))
            )}
            {youtube.length > 0 && (
              <p className="text-sm">
                Your brand appears in{" "}
                <strong>
                  {youtubeMentions} of {youtube.length}
                </strong>{" "}
                top YouTube videos.
                {youtubeMentions === 0 && (
                  <span className="block mt-1" style={{ color: "var(--gap)" }}>
                    Gap — consider publishing a comparison video targeting these topics.
                  </span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
