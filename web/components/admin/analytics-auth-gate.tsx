"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, KeyRound, Lock } from "lucide-react";
import { unlockAnalyticsDashboard, type UnlockAnalyticsState } from "@/app/admin/analytics/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AnalyticsAuthGate({ configured }: { configured: boolean }) {
  const searchParams = useSearchParams();
  const urlKeyError = searchParams?.get("key")
    ? "That URL key did not match. Use the unlock form below."
    : null;

  const [state, formAction, pending] = useActionState<
    UnlockAnalyticsState | null,
    FormData
  >(unlockAnalyticsDashboard, urlKeyError ? { error: urlKeyError } : null);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center p-8">
      <Card className="w-full border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Analytics dashboard
          </CardTitle>
          <CardDescription>
            Paste <code className="text-xs">ANALYTICS_SECRET</code> from{" "}
            <code className="text-xs">web/.env.local</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!configured && (
            <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Server does not see <code>ANALYTICS_SECRET</code>. Add it to{" "}
                <code>web/.env.local</code> and restart{" "}
                <code>npm run dev</code> from the <code>web/</code> folder.
              </p>
            </div>
          )}

          <form action={formAction} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="analytics-key">Access key</Label>
              <Input
                id="analytics-key"
                name="key"
                type="password"
                placeholder="Paste ANALYTICS_SECRET"
                autoComplete="off"
                disabled={pending}
                required
              />
            </div>

            {state?.error && (
              <p className="flex items-start gap-2 text-sm text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {state.error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={pending || !configured}>
              <KeyRound className="mr-2 h-4 w-4" />
              {pending ? "Verifying…" : "Unlock dashboard"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground">
            Use <code>http://127.0.0.1:3000/admin/analytics</code> (same host as{" "}
            <code>npm run dev</code>).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
