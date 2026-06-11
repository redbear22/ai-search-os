"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Bot, Layout, User, MapPin } from "lucide-react";
import type {
  GoogleIOReadiness,
  GoogleIORecommendation,
} from "@/lib/google-io-2026";
import { useActionStore } from "@/store/actionStore";

const priorityColors = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-blue-500";
  if (score >= 40) return "text-yellow-500";
  return "text-red-500";
}

export default function GoogleIO2026Page() {
  const addAction = useActionStore((s) => s.addAction);
  const [domain, setDomain] = useState("");
  const [hasGbp, setHasGbp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [readiness, setReadiness] = useState<GoogleIOReadiness | null>(null);

  const analyzeDomain = async () => {
    if (!domain.trim()) {
      toast.error("Please enter a domain");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/google-io-2026/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), hasGbp }),
      });

      const data = await response.json();

      if (data.success) {
        setReadiness(data.readiness as GoogleIOReadiness);
        toast.success("Google I/O 2026 readiness analysis complete");
      } else {
        toast.error(data.error || "Analysis failed");
      }
    } catch {
      toast.error("Failed to analyze domain");
    } finally {
      setLoading(false);
    }
  };

  const addToPlan = (rec: GoogleIORecommendation) => {
    addAction({
      id: `google-io-${Date.now()}`,
      layerId: "discoverability",
      description: `${rec.title}: ${rec.fix} (${domain})`,
      ownerTeam: "SEO",
      ownerPerson: "",
      dueWeek: rec.priority === "critical" ? 1 : rec.priority === "high" ? 2 : 4,
      resourceAsks: [rec.feature, rec.timeline],
      status: "not_started",
      createdAt: new Date().toISOString(),
    });
    toast.success("Added to Action Plan");
  };

  const pillars = readiness
    ? [
        {
          key: "searchAgent",
          label: "Search Agents",
          icon: Bot,
          score: readiness.searchAgentQualification.score,
          details: [
            {
              label: "Agent discoverable (llms.txt)",
              ok: readiness.searchAgentQualification.agentDiscoverable,
            },
            {
              label: "Reasoning-friendly structure",
              ok: readiness.searchAgentQualification.structuredForReasoning,
            },
            {
              label: `Entity richness: ${readiness.searchAgentQualification.entityRichness}`,
              ok: readiness.searchAgentQualification.entityRichness >= 45,
            },
            {
              label: `Temporal relevance: ${readiness.searchAgentQualification.temporalRelevance}`,
              ok: readiness.searchAgentQualification.temporalRelevance >= 50,
            },
          ],
        },
        {
          key: "generativeUI",
          label: "Generative UI",
          icon: Layout,
          score: readiness.generativeUIReadiness.score,
          details: [
            {
              label: "Interactive elements",
              ok: readiness.generativeUIReadiness.interactiveElements,
            },
            {
              label: "Structured data",
              ok: readiness.generativeUIReadiness.dataStructured,
            },
            {
              label: "Visual metadata",
              ok: readiness.generativeUIReadiness.visualMetadata,
            },
            {
              label: "Action buttons",
              ok: readiness.generativeUIReadiness.actionButtons,
            },
          ],
        },
        {
          key: "personalIntelligence",
          label: "Personal Intelligence",
          icon: User,
          score: readiness.personalIntelligence.score,
          details: [
            {
              label: "User context ready",
              ok: readiness.personalIntelligence.userContextReady,
            },
            {
              label: "Privacy compliant",
              ok: readiness.personalIntelligence.privacyCompliant,
            },
            ...(readiness.personalIntelligence.personalizationSignals.length > 0
              ? readiness.personalIntelligence.personalizationSignals.map(
                  (s) => ({ label: s.replace(/_/g, " "), ok: true })
                )
              : []),
          ],
        },
        {
          key: "localBooking",
          label: "Local Booking Agent",
          icon: MapPin,
          score: readiness.localBookingAgent.score,
          details: [
            {
              label: "GBP optimized",
              ok: readiness.localBookingAgent.gbpOptimized,
            },
            {
              label: "Booking enabled",
              ok: readiness.localBookingAgent.bookingEnabled,
            },
            {
              label: "Real-time availability",
              ok: readiness.localBookingAgent.availabilityRealTime,
            },
          ],
        },
      ]
    : [];

  return (
    <div className="container mx-auto space-y-6 py-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Google I/O 2026 Response Features</h1>
        <p className="mt-1 text-muted-foreground">
          Prepare for Search Agents, Generative UI, Personal Intelligence, and
          Local Booking Agents
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label>Domain to Analyze</Label>
              <Input
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyzeDomain()}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="has-gbp"
                checked={hasGbp}
                onCheckedChange={(v) => setHasGbp(v === true)}
              />
              <Label htmlFor="has-gbp" className="cursor-pointer">
                Has Google Business Profile
              </Label>
            </div>
            <LoadingButton onClick={analyzeDomain} loading={loading}>
              {loading ? (
                "Analyzing…"
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze
                </>
              )}
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      {readiness && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Overall Readiness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <span
                  className={`text-5xl font-bold ${scoreColor(readiness.overall)}`}
                >
                  {readiness.overall}
                </span>
                <div className="flex-1">
                  <Progress value={readiness.overall} className="h-3" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Weighted: Search Agents 35% · Generative UI 25% · Personal
                    Intelligence 25% · Local Booking 15%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {pillars.map((pillar) => (
              <Card key={pillar.key}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <pillar.icon className="h-5 w-5" />
                    {pillar.label}
                  </CardTitle>
                  <span
                    className={`text-2xl font-bold ${scoreColor(pillar.score)}`}
                  >
                    {pillar.score}
                  </span>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={pillar.score} className="h-2" />
                  <ul className="mt-3 space-y-1 text-sm">
                    {pillar.details.map((d) => (
                      <li
                        key={d.label}
                        className={
                          d.ok ? "text-emerald-600" : "text-muted-foreground"
                        }
                      >
                        {d.ok ? "✓" : "○"} {d.label}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {readiness.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {readiness.recommendations.map((rec, i) => (
                  <div
                    key={`${rec.title}-${i}`}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={`${priorityColors[rec.priority]} text-white`}
                        >
                          {rec.priority}
                        </Badge>
                        <Badge variant="outline">{rec.feature}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {rec.timeline}
                        </span>
                      </div>
                      <h3 className="font-semibold">{rec.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {rec.description}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Fix: </span>
                        {rec.fix}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addToPlan(rec)}
                    >
                      Add to Plan
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
