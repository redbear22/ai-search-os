"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  ClipboardList,
  AlertTriangle,
  Calendar,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuditStore } from "@/store/auditStore";
import { useGapStore } from "@/store/gapStore";
import { useActionStore } from "@/store/actionStore";

const quickActions: {
  title: string;
  href: string;
  icon: LucideIcon;
  color: string;
  description: string;
}[] = [
  {
    title: "Run Audit",
    href: "/audit",
    icon: ClipboardList,
    color: "bg-blue-500",
    description: "Analyze your brand across 4 layers",
  },
  {
    title: "View Gaps",
    href: "/gaps",
    icon: AlertTriangle,
    color: "bg-yellow-500",
    description: "Review detected visibility gaps",
  },
  {
    title: "Action Plan",
    href: "/action-plan",
    icon: Calendar,
    color: "bg-green-500",
    description: "Track fixes in your 90-day plan",
  },
  {
    title: "Executive Summary",
    href: "/executive-summary",
    icon: FileText,
    color: "bg-purple-500",
    description: "Generate leadership report",
  },
];

export default function DashboardPage() {
  const { status } = useSession();
  const isCompleted = useAuditStore((s) => s.isCompleted);
  const resolvedGaps = useGapStore((s) => s.resolvedGaps);
  const actions = useActionStore((s) => s.actions);

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  const actionsWithCounts = quickActions.map((action) => {
    if (action.title === "View Gaps") {
      return { ...action, description: `${resolvedGaps.length} gaps detected` };
    }
    if (action.title === "Action Plan") {
      return { ...action, description: `${actions.length} active actions` };
    }
    return action;
  });

  return (
    <div className="container mx-auto space-y-4 p-4 animate-fade-in sm:space-y-6 sm:p-6">
      <HeroSection />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {actionsWithCounts.map((action) => {
          const Icon = action.icon;
          const iconColor = action.color.replace("bg-", "text-");

          return (
            <Link key={action.title} href={action.href}>
              <Card className="gradient-border hover-lift cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{action.title}</CardTitle>
                  <div className={`rounded-full p-2 ${action.color} bg-opacity-10`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                  <div className="mt-3 flex items-center text-xs text-primary">
                    Get started <ArrowRight className="ml-1 h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card className="gradient-border hover-lift">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!isCompleted ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No audits completed yet</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/audit">Start your first audit →</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your last audit shows {resolvedGaps.length} gaps to address.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="gradient-border hover-lift">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Audit completed</span>
                <span className={isCompleted ? "text-green-500" : "text-yellow-500"}>
                  {isCompleted ? "✓ Yes" : "⚠ Not yet"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Gaps detected</span>
                <span>{resolvedGaps.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Actions in plan</span>
                <span>{actions.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
