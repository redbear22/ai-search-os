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
import { Shield, Building2, Users, Award, MessageCircle } from "lucide-react";
import type { EntityTrustScore, TrustRecommendation } from "@/lib/entity-trust";
import { useActionStore } from "@/store/actionStore";

const gradeColors: Record<EntityTrustScore["grade"], string> = {
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-yellow-500",
  D: "bg-orange-500",
  F: "bg-red-500",
};

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

export default function EntityTrustPage() {
  const addAction = useActionStore((s) => s.addAction);
  const [brandName, setBrandName] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EntityTrustScore | null>(null);

  const analyze = async () => {
    if (!brandName.trim()) {
      toast.error("Please enter a brand name");
      return;
    }
    if (!domain.trim()) {
      toast.error("Please enter a domain");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/entity-trust/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          domain: domain.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.score as EntityTrustScore);
        toast.success("Entity trust analysis complete");
      } else {
        toast.error(data.error || "Analysis failed");
      }
    } catch {
      toast.error("Failed to analyze entity trust");
    } finally {
      setLoading(false);
    }
  };

  const addToPlan = (rec: TrustRecommendation) => {
    addAction({
      id: `entity-trust-${Date.now()}`,
      layerId: "trust",
      description: `${rec.title}: ${rec.fix} (${brandName})`,
      ownerTeam: "Brand Strategy",
      ownerPerson: "",
      dueWeek: rec.priority === "critical" ? 1 : rec.priority === "high" ? 2 : 4,
      resourceAsks: [rec.category, `+${rec.expectedTrustBoost} pts`],
      status: "not_started",
      createdAt: new Date().toISOString(),
    });
    toast.success("Added to Action Plan");
  };

  const pillars = result
    ? [
        {
          key: "footprint",
          label: "Entity Footprint",
          icon: Building2,
          score: result.entityFootprint.score,
          details: [
            { label: `NAP consistency: ${result.entityFootprint.napConsistency}`, ok: result.entityFootprint.napConsistency >= 60 },
            { label: "Knowledge Graph connected", ok: result.entityFootprint.knowledgeGraphConnected },
            { label: "Wikipedia page", ok: result.entityFootprint.wikipediaPage },
            { label: `Credible citations: ${result.entityFootprint.credibleCitations}`, ok: result.entityFootprint.credibleCitations > 0 },
            ...(result.entityFootprint.schemaMarkup.length > 0
              ? [{ label: `Schema: ${result.entityFootprint.schemaMarkup.join(", ")}`, ok: true }]
              : [{ label: "No Organization schema detected", ok: false }]),
          ],
        },
        {
          key: "mentions",
          label: "Third-Party Mentions",
          icon: Users,
          score: result.thirdPartyMentions.score,
          details: [
            { label: `${result.thirdPartyMentions.totalMentions} total signals`, ok: result.thirdPartyMentions.totalMentions >= 3 },
            { label: `Sentiment: ${Math.round(result.thirdPartyMentions.sentimentScore * 100)}%`, ok: result.thirdPartyMentions.sentimentScore >= 0.5 },
            ...result.thirdPartyMentions.reviewPlatforms
              .filter((r) => r.found)
              .map((r) => ({ label: `${r.platform} linked`, ok: true })),
          ],
        },
        {
          key: "trust",
          label: "Trust Signals",
          icon: Award,
          score: result.trustSignals.score,
          details: [
            { label: `${result.trustSignals.yearsInBusiness} years in business`, ok: result.trustSignals.yearsInBusiness >= 3 },
            { label: `${result.trustSignals.caseStudies} case study signals`, ok: result.trustSignals.caseStudies >= 3 },
            ...result.trustSignals.certifications
              .filter((c) => c.found)
              .map((c) => ({ label: c.name, ok: true })),
          ],
        },
        {
          key: "community",
          label: "Community Presence",
          icon: MessageCircle,
          score: result.communityPresence.score,
          details: [
            { label: `Reddit refs: ${result.communityPresence.redditMentions}`, ok: result.communityPresence.redditMentions > 0 },
            { label: `YouTube refs: ${result.communityPresence.youtubeMentions}`, ok: result.communityPresence.youtubeMentions > 0 },
            { label: `Quora refs: ${result.communityPresence.quoraAnswers}`, ok: result.communityPresence.quoraAnswers > 0 },
          ],
        },
      ]
    : [];

  return (
    <div className="container mx-auto space-y-4 p-4 animate-fade-in sm:space-y-6 sm:p-6 sm:py-8">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl md:text-3xl">
          <Shield className="h-7 w-7 text-primary" />
          Entity &amp; Trust Signal Architecture
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Measure entity footprint, third-party validation, trust signals, and community presence
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            <div>
              <Label>Brand name</Label>
              <Input
                placeholder="PickAdviser"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
              />
            </div>
            <div>
              <Label>Domain</Label>
              <Input
                placeholder="pickadviser.org"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
              />
            </div>
            <div className="flex items-end">
              <LoadingButton onClick={analyze} loading={loading} className="w-full sm:w-auto">
                {loading ? "Analyzing…" : "Analyze Entity Trust"}
              </LoadingButton>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Optional: set GOOGLE_KNOWLEDGE_API_KEY for Knowledge Graph lookup.
          </p>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Overall Trust Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className={`text-5xl font-bold ${scoreColor(result.overall)}`}>
                    {result.overall}
                  </span>
                  <Badge className={`${gradeColors[result.grade]} text-white`}>
                    Grade {result.grade}
                  </Badge>
                </div>
                <div className="flex-1">
                  <Progress value={result.overall} className="h-3" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Weighted: Entity 35% · Mentions 25% · Trust 25% · Community 15%
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
                  <span className={`text-2xl font-bold ${scoreColor(pillar.score)}`}>
                    {pillar.score}
                  </span>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={pillar.score} className="h-2" />
                  <ul className="mt-3 space-y-1 text-sm">
                    {pillar.details.map((d) => (
                      <li
                        key={d.label}
                        className={d.ok ? "text-emerald-600" : "text-muted-foreground"}
                      >
                        {d.ok ? "✓" : "○"} {d.label}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {result.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.recommendations.map((rec, i) => (
                  <div
                    key={`${rec.title}-${i}`}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${priorityColors[rec.priority]} text-white`}>
                          {rec.priority}
                        </Badge>
                        <Badge variant="outline">{rec.category}</Badge>
                        <Badge variant="secondary">+{rec.expectedTrustBoost} pts</Badge>
                      </div>
                      <h3 className="font-semibold">{rec.title}</h3>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      <p className="text-sm">
                        <span className="font-medium">Fix: </span>
                        {rec.fix}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => addToPlan(rec)}>
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
