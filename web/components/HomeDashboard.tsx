"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { ClarityPlatformsTestButton } from "@/components/dev/clarity-platforms-test-button";
import { UnifiedAuditTestButton } from "@/components/dev/unified-audit-test-button";
import { HeroSection } from "@/components/HeroSection";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { TooltipWrapper } from "@/components/TooltipWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  {
    name: "4-Layer Audit",
    status: "live",
    desc: "Discoverability, Clarity, Authority, Trust",
    href: "/audit",
    tooltip: "Analyze your brand across all four visibility layers",
  },
  {
    name: "Gaps",
    status: "live",
    desc: "Detected opportunities sorted by severity",
    href: "/gaps",
    tooltip: "Review gaps and generate AI-powered fixes",
  },
  {
    name: "Action Plan",
    status: "live",
    desc: "90-day kanban for tracking fixes",
    href: "/action-plan",
    tooltip: "Drag cards between columns and track progress",
  },
  {
    name: "AI Answer Hub",
    status: "planned",
    desc: "Multi-engine must-answer synthesis",
    tooltip: "Coming soon — multi-engine synthesis",
  },
] as const;

export function HomeDashboard() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <HeroSection />

      <div className="flex flex-wrap items-center gap-2">
        <TooltipWrapper content="Run a full audit across all 4 layers">
          <Button asChild>
            <Link href="/audit">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Open 4-Layer Audit
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </TooltipWrapper>
        {process.env.NODE_ENV === "development" && (
          <>
            <ClarityPlatformsTestButton />
            <UnifiedAuditTestButton />
          </>
        )}
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        {modules.map((m) => (
          <Card key={m.name} className="gradient-border hover-lift">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{m.name}</CardTitle>
                <CardDescription className="mt-1">{m.desc}</CardDescription>
              </div>
              <Badge variant={m.status === "live" ? "default" : "outline"}>{m.status}</Badge>
            </CardHeader>
            {"href" in m && m.href && (
              <CardContent>
                <TooltipWrapper content={m.tooltip}>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={m.href}>Open</Link>
                  </Button>
                </TooltipWrapper>
              </CardContent>
            )}
          </Card>
        ))}
      </section>
    </div>
  );
}
