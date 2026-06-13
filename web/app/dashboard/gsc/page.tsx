"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, LineChart, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function GscDashboardPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="container mx-auto space-y-6 p-4 animate-fade-in sm:p-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <LineChart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Google Search Console</h1>
          <Badge variant="secondary">Coming soon</Badge>
        </div>
        <p className="max-w-2xl text-muted-foreground">
          GSC query cache and discoverability signals will connect here — reuse Search Console
          data in the same editorial pipeline as audits and gaps.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="gradient-border hover-lift">
          <CardHeader>
            <CardTitle>Query cache</CardTitle>
            <CardDescription>
              Cached GSC queries will feed gap detection and action plans without repeated API
              calls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              OAuth and refresh-token setup are not wired in this build. When enabled, queries will
              sync on a schedule and appear alongside audit discoverability metrics.
            </p>
            <p>
              Required env vars: <code className="text-xs">GSC_ENABLED</code>,{" "}
              <code className="text-xs">GOOGLE_GSC_CLIENT_ID</code>,{" "}
              <code className="text-xs">GOOGLE_GSC_CLIENT_SECRET</code>,{" "}
              <code className="text-xs">GOOGLE_GSC_REFRESH_TOKEN</code>.
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-border hover-lift">
          <CardHeader>
            <CardTitle>Setup &amp; diagnostics</CardTitle>
            <CardDescription>
              Verify integration flags before OAuth goes live.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {isAdmin ? (
              <Button variant="outline" asChild className="w-fit">
                <Link href="/admin/env-check">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Open env check
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ask your workspace admin to review GSC flags on the env check page.
              </p>
            )}
            <Button variant="link" asChild className="h-auto w-fit p-0">
              <Link href="/help">
                Read setup docs in Help
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
            <Button variant="link" asChild className="h-auto w-fit p-0">
              <Link href="/audit">
                Continue with manual audit
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
