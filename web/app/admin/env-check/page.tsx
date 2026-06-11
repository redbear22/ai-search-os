import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { getEnvSnapshot } from "@/lib/env-diagnostics";
import { EnvCheckRefreshButton } from "@/components/admin/env-check-refresh-button";
import { TestConnectionButton } from "@/components/admin/test-connection-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="h-4 w-4 text-green-500" aria-label="configured" />
  ) : (
    <XCircle className="h-4 w-4 text-red-500" aria-label="missing" />
  );
}

export default function AdminEnvCheckPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const snapshot = getEnvSnapshot();
  const coreReady =
    snapshot.ready.clarity &&
    snapshot.ready.dataforseo &&
    snapshot.ready.trends &&
    snapshot.ready.keywordsEverywhere;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Environment diagnostics</h1>
          <p className="text-sm text-muted-foreground">
            Development-only page — verify API keys and test connectivity. Not available in production
            builds.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Source: <code className="text-xs">{snapshot.source}</code> · NODE_ENV:{" "}
            <Badge variant="outline">{snapshot.nodeEnv}</Badge>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Next.js only loads <code>web/.env.local</code>. Keys in the repo-root{" "}
            <code>.env.local</code> (Python/Streamlit) must be copied here to show as configured.
          </p>
        </div>
        <EnvCheckRefreshButton />
      </div>

      {snapshot.warnings.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Configuration warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-amber-700">
              {snapshot.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {coreReady && snapshot.warnings.length === 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="space-y-2 pt-6 text-sm text-green-600">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              All core integrations (OpenAI, DataForSEO, Trends MCP, Keywords Everywhere) are
              configured.
            </p>
            <p className="text-xs text-muted-foreground">
              Clarity extras: Perplexity {snapshot.ready.perplexity ? "✓" : "✗"} · Claude{" "}
              {snapshot.ready.claude ? "✓" : "✗"} · Gemini{" "}
              {snapshot.ready.gemini ? "✓" : "✗"} · Auth{" "}
              {snapshot.ready.auth ? "✓" : "✗"} (optional — native platform tabs / sign-in)
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {snapshot.services.map((service) => (
          <Card key={service.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <StatusIcon ok={service.configured} />
                {service.name}
                {service.optional && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    optional
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{service.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Environment variables</p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {service.vars.map((v) => (
                    <div
                      key={v.name}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <StatusIcon ok={v.set} />
                      <span className="font-mono text-xs">{v.name}</span>
                      {v.preview && (
                        <span className="ml-auto text-xs text-muted-foreground">{v.preview}</span>
                      )}
                      {!v.preview && v.value && (
                        <span className="ml-auto truncate text-xs text-muted-foreground">
                          {v.value}
                        </span>
                      )}
                      {!v.required && (
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          optional
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {service.id === "trends" && snapshot.trendsUrl && (
                <p className="text-xs text-muted-foreground">
                  Resolved URL: <code>{snapshot.trendsUrl}</code>
                </p>
              )}

              {service.id === "google_oauth" && process.env.NEXTAUTH_URL?.trim() && (
                <p className="text-xs text-muted-foreground">
                  Register in{" "}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    Google Cloud Console
                  </a>{" "}
                  → OAuth client → Authorized redirect URIs:{" "}
                  <code>
                    {process.env.NEXTAUTH_URL.trim().replace(/\/$/, "")}/api/auth/callback/google
                  </code>
                </p>
              )}

              <TestConnectionButton serviceId={service.id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
